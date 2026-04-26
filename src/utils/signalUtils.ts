// RULE 1: no synthetic ECG generation in production code paths.
// The previous generateSyntheticECG was deleted. Use src/utils/wfdbParser.ts
// to load real PhysioNet records or parse uploaded CSVs.

const MAX_RESPONSE_SAMPLES = 10000; // RULE 4: cap chart payload

/**
 * Downsample by averaging chunks. Used to keep chart payloads <= MAX_RESPONSE_SAMPLES.
 * Analysis uses the FULL signal — only previews/charts use the downsampled view.
 */
export function downsampleSignal(signal: number[], targetLength: number): number[] {
  const cap = Math.min(targetLength, MAX_RESPONSE_SAMPLES);
  if (signal.length <= cap) return signal.slice();
  const chunkSize = signal.length / cap;
  const result: number[] = new Array(cap);
  for (let i = 0; i < cap; i++) {
    const start = Math.floor(i * chunkSize);
    const end = Math.max(start + 1, Math.floor((i + 1) * chunkSize));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end && j < signal.length; j++) {
      sum += signal[j];
      count++;
    }
    result[i] = count > 0 ? sum / count : 0;
  }
  return result;
}

export function generateECGPath(signal: number[], width: number, height: number): string {
  if (signal.length === 0) return "";
  const step = width / signal.length;
  const mid = height / 2;
  // Auto-scale to signal range so real PhysioNet amplitudes render visibly.
  let min = Infinity;
  let max = -Infinity;
  for (const v of signal) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  const scale = (height * 0.8) / range;
  const offset = (max + min) / 2;
  let d = `M 0 ${mid - (signal[0] - offset) * scale}`;
  for (let i = 1; i < signal.length; i++) {
    d += ` L ${i * step} ${mid - (signal[i] - offset) * scale}`;
  }
  return d;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Estimate signal quality 0-100 from variance and high-frequency content.
 * Real metric, not a placeholder.
 */
export function computeSignalQuality(signal: number[]): number {
  if (signal.length < 100) return 0;
  const n = signal.length;
  const mean = signal.reduce((a, b) => a + b, 0) / n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (signal[i] - mean) ** 2;
  variance /= n;
  const std = Math.sqrt(variance);

  // High-frequency power proxy via first differences
  let hfPower = 0;
  for (let i = 1; i < n; i++) {
    const d = signal[i] - signal[i - 1];
    hfPower += d * d;
  }
  hfPower /= n - 1;
  const snrProxy = variance > 0 ? Math.log10(variance / (hfPower + 1e-9)) : 0;
  const score = 60 + snrProxy * 20 + Math.min(std, 1) * 10;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Pan-Tompkins-lite R-peak detector for real ECG signals.
 * Returns sample indices of detected R peaks.
 */
export function detectRPeaks(signal: number[], samplingRate: number): number[] {
  if (signal.length < samplingRate) return [];
  // Bandpass-ish: high-pass via moving-average subtraction
  const winBaseline = Math.max(1, Math.round(samplingRate * 0.2));
  const baseline: number[] = new Array(signal.length);
  let acc = 0;
  for (let i = 0; i < signal.length; i++) {
    acc += signal[i];
    if (i >= winBaseline) acc -= signal[i - winBaseline];
    baseline[i] = acc / Math.min(i + 1, winBaseline);
  }
  // Derivative + square
  const sq: number[] = new Array(signal.length).fill(0);
  for (let i = 1; i < signal.length; i++) {
    const d = signal[i] - baseline[i] - (signal[i - 1] - baseline[i - 1]);
    sq[i] = d * d;
  }
  // Moving integration ~150ms
  const winInt = Math.max(1, Math.round(samplingRate * 0.15));
  const integ: number[] = new Array(signal.length);
  let s = 0;
  for (let i = 0; i < signal.length; i++) {
    s += sq[i];
    if (i >= winInt) s -= sq[i - winInt];
    integ[i] = s;
  }
  // Adaptive threshold
  const sorted = [...integ].sort((a, b) => a - b);
  const noise = sorted[Math.floor(sorted.length * 0.5)];
  const peakRef = sorted[Math.floor(sorted.length * 0.98)];
  const threshold = noise + 0.35 * (peakRef - noise);
  const refractory = Math.round(samplingRate * 0.25);

  const peaks: number[] = [];
  let lastPeak = -refractory;
  for (let i = 1; i < integ.length - 1; i++) {
    if (
      integ[i] > threshold &&
      integ[i] >= integ[i - 1] &&
      integ[i] >= integ[i + 1] &&
      i - lastPeak >= refractory
    ) {
      // Refine: pick local max in raw signal within +/- 50ms
      const w = Math.round(samplingRate * 0.05);
      let best = i;
      let bestVal = signal[i];
      for (let j = Math.max(0, i - w); j < Math.min(signal.length, i + w); j++) {
        if (signal[j] > bestVal) {
          bestVal = signal[j];
          best = j;
        }
      }
      peaks.push(best);
      lastPeak = i;
    }
  }
  return peaks;
}

export const MAX_CHART_SAMPLES = MAX_RESPONSE_SAMPLES;
