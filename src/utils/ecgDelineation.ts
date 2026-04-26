/**
 * Real PQRST delineation, computed from the actual signal — no fixed offsets,
 * no synthetic data, no library "guess" positions. Every index returned is
 * a real sample index found by searching the local signal around each R peak.
 *
 * Clinical search windows (per PROBLEM 1 spec):
 *  - Q peak     = local minimum in [r - 60ms, r - 5ms]
 *  - S peak     = local minimum in [r + 5ms, r + 80ms]
 *  - P peak     = local MAXIMUM in [r - 300ms, r - 80ms]
 *  - T peak     = local max |signal - baseline| in [r + 100ms, r + 450ms]
 *  - P onset    = walk left from P peak up to 60ms, baseline crossing
 *  - P offset   = walk right from P peak up to 60ms, baseline crossing
 *  - T offset   = walk right from T peak up to 200ms, baseline crossing
 *  - T onset    = walk left from T peak up to 80ms, baseline crossing
 *
 * Baseline = median of TP segment (prev T offset → current P onset). If TP
 * segment is unavailable, fall back to median of 300ms before the P search
 * window. Never assume zero.
 *
 * NaN rule: if the candidate extremum's deviation from baseline is below
 * 5% of the R amplitude, return NaN. Caller filters NaN before drawing.
 */

export interface DelineationData {
  p_onsets: number[];
  p_peaks: number[];
  p_offsets: number[];
  q_peaks: number[];
  r_peaks: number[];
  s_peaks: number[];
  t_onsets: number[];
  t_peaks: number[];
  t_offsets: number[];
}

export const EMPTY_DELINEATION: DelineationData = {
  p_onsets: [],
  p_peaks: [],
  p_offsets: [],
  q_peaks: [],
  r_peaks: [],
  s_peaks: [],
  t_onsets: [],
  t_peaks: [],
  t_offsets: [],
};

const NaNi = Number.NaN;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function localMinIndex(signal: number[], from: number, to: number): number {
  if (from < 0) from = 0;
  if (to > signal.length) to = signal.length;
  if (to - from < 2) return NaNi;
  let bestIdx = from;
  let bestVal = signal[from];
  for (let i = from + 1; i < to; i++) {
    if (signal[i] < bestVal) {
      bestVal = signal[i];
      bestIdx = i;
    }
  }
  return bestIdx;
}

function localMaxIndex(signal: number[], from: number, to: number): number {
  if (from < 0) from = 0;
  if (to > signal.length) to = signal.length;
  if (to - from < 2) return NaNi;
  let bestIdx = from;
  let bestVal = signal[from];
  for (let i = from + 1; i < to; i++) {
    if (signal[i] > bestVal) {
      bestVal = signal[i];
      bestIdx = i;
    }
  }
  return bestIdx;
}

function localMaxAbsDevIndex(
  signal: number[],
  from: number,
  to: number,
  baseline: number
): number {
  if (from < 0) from = 0;
  if (to > signal.length) to = signal.length;
  if (to - from < 2) return NaNi;
  let bestIdx = from;
  let bestVal = Math.abs(signal[from] - baseline);
  for (let i = from + 1; i < to; i++) {
    const d = Math.abs(signal[i] - baseline);
    if (d > bestVal) {
      bestVal = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function walkLeftToBaseline(
  signal: number[],
  start: number,
  lowerBound: number,
  baseline: number,
  band: number
): number {
  const lo = Math.max(0, lowerBound);
  for (let i = start; i >= lo; i--) {
    if (Math.abs(signal[i] - baseline) <= band) return i;
  }
  return NaNi;
}

function walkRightToBaseline(
  signal: number[],
  start: number,
  upperBound: number,
  baseline: number,
  band: number
): number {
  const hi = Math.min(signal.length - 1, upperBound);
  for (let i = start; i <= hi; i++) {
    if (Math.abs(signal[i] - baseline) <= band) return i;
  }
  return NaNi;
}

/**
 * Delineate every R peak with clinically correct search windows.
 * Returns parallel arrays of indices. NaN where a wave couldn't be found.
 */
export function delineate(
  signal: number[],
  rPeaks: number[],
  fs: number
): DelineationData {
  const n = signal.length;
  if (n === 0 || rPeaks.length === 0 || fs <= 0) return EMPTY_DELINEATION;

  const ms = (m: number) => Math.max(1, Math.round((m / 1000) * fs));

  // Clinical windows per spec (relative to R peak)
  const Q_FROM = ms(60); // r - 60ms
  const Q_TO = ms(5); // r - 5ms
  const S_FROM = ms(5); // r + 5ms
  const S_TO = ms(80); // r + 80ms
  const P_FROM = ms(300); // r - 300ms
  const P_TO = ms(80); // r - 80ms
  const T_FROM = ms(100); // r + 100ms
  const T_TO = ms(450); // r + 450ms
  const P_ON_WIN = ms(60);
  const P_OFF_WIN = ms(60);
  const T_ON_WIN = ms(80);
  const T_OFF_WIN = ms(200);
  const FALLBACK_BASELINE_WIN = ms(300);

  const result: DelineationData = {
    p_onsets: [],
    p_peaks: [],
    p_offsets: [],
    q_peaks: [],
    r_peaks: [],
    s_peaks: [],
    t_onsets: [],
    t_peaks: [],
    t_offsets: [],
  };

  // First pass: get T offsets per beat using a provisional baseline (median of
  // 300ms before P search window). Then a second pass refines using TP segment.
  // To keep it simple and correct, we compute baseline per beat from previous
  // beat's T_offset (if known) → current beat's P search start.
  let prevTOffset: number = NaNi;

  for (let beat = 0; beat < rPeaks.length; beat++) {
    const r = rPeaks[beat];
    if (r < 0 || r >= n) {
      // Push NaN placeholders to keep arrays aligned by beat index
      result.r_peaks.push(NaNi);
      result.q_peaks.push(NaNi);
      result.s_peaks.push(NaNi);
      result.p_peaks.push(NaNi);
      result.p_onsets.push(NaNi);
      result.p_offsets.push(NaNi);
      result.t_peaks.push(NaNi);
      result.t_onsets.push(NaNi);
      result.t_offsets.push(NaNi);
      continue;
    }
    result.r_peaks.push(r);

    // ---- Baseline from TP segment ----
    const pSearchStart = Math.max(0, r - P_FROM);
    let baselineSamples: number[] = [];
    if (Number.isFinite(prevTOffset) && prevTOffset < pSearchStart - 2) {
      for (let i = Math.max(0, prevTOffset); i < pSearchStart && i < n; i++) {
        baselineSamples.push(signal[i]);
      }
    }
    if (baselineSamples.length < 5) {
      // Fallback: 300ms before the P search window
      const lo = Math.max(0, pSearchStart - FALLBACK_BASELINE_WIN);
      baselineSamples = [];
      for (let i = lo; i < pSearchStart && i < n; i++) baselineSamples.push(signal[i]);
    }
    const baseline = baselineSamples.length > 0 ? median(baselineSamples) : signal[r];
    const rAmp = Math.abs(signal[r] - baseline) || 1;
    const minDev = rAmp * 0.05; // 5% threshold
    const baselineBand = Math.max(0.02, rAmp * 0.05);

    // ---- Q peak: local min in [r - 60ms, r - 5ms] ----
    const qFromIdx = r - Q_FROM;
    const qToIdx = r - Q_TO;
    let qIdx: number = NaNi;
    if (qToIdx > qFromIdx + 1) {
      const candidate = localMinIndex(signal, qFromIdx, qToIdx);
      if (
        Number.isFinite(candidate) &&
        signal[candidate] < baseline &&
        Math.abs(signal[candidate] - baseline) >= minDev * 0.5
      ) {
        qIdx = candidate;
      }
    }
    result.q_peaks.push(qIdx);

    // ---- S peak: local min in [r + 5ms, r + 80ms] ----
    const sFromIdx = r + S_FROM;
    const sToIdx = r + S_TO;
    let sIdx: number = NaNi;
    if (sToIdx > sFromIdx + 1 && sToIdx < n) {
      const candidate = localMinIndex(signal, sFromIdx, sToIdx);
      if (
        Number.isFinite(candidate) &&
        signal[candidate] < baseline &&
        Math.abs(signal[candidate] - baseline) >= minDev * 0.5
      ) {
        sIdx = candidate;
      }
    }
    result.s_peaks.push(sIdx);

    // ---- P peak: local MAXIMUM in [r - 300ms, r - 80ms] ----
    const pFromIdx = r - P_FROM;
    const pToIdx = r - P_TO;
    let pIdx: number = NaNi;
    if (pToIdx > pFromIdx + 1 && pFromIdx >= 0) {
      const candidate = localMaxIndex(signal, pFromIdx, pToIdx);
      // P is a positive bump above baseline, require >5% R amp
      if (
        Number.isFinite(candidate) &&
        signal[candidate] > baseline &&
        signal[candidate] - baseline >= minDev
      ) {
        pIdx = candidate;
      }
    }
    result.p_peaks.push(pIdx);

    // ---- P onset / offset: walk to baseline within ±60ms ----
    if (Number.isFinite(pIdx)) {
      const pOn = walkLeftToBaseline(signal, pIdx, pIdx - P_ON_WIN, baseline, baselineBand);
      const pOff = walkRightToBaseline(signal, pIdx, pIdx + P_OFF_WIN, baseline, baselineBand);
      result.p_onsets.push(pOn);
      result.p_offsets.push(pOff);
    } else {
      result.p_onsets.push(NaNi);
      result.p_offsets.push(NaNi);
    }

    // ---- T peak: max |dev| in [r + 100ms, r + 450ms] ----
    const nextR = beat + 1 < rPeaks.length ? rPeaks[beat + 1] : n;
    const tFromIdx = r + T_FROM;
    const tToIdx = Math.min(r + T_TO, nextR - ms(50), n);
    let tIdx: number = NaNi;
    if (tToIdx > tFromIdx + 2) {
      const candidate = localMaxAbsDevIndex(signal, tFromIdx, tToIdx, baseline);
      // T amplitude must be at least 8% of R amp
      if (
        Number.isFinite(candidate) &&
        Math.abs(signal[candidate] - baseline) >= rAmp * 0.08
      ) {
        tIdx = candidate;
      }
    }
    result.t_peaks.push(tIdx);

    // ---- T onset / offset ----
    if (Number.isFinite(tIdx)) {
      const tOn = walkLeftToBaseline(signal, tIdx, tIdx - T_ON_WIN, baseline, baselineBand);
      const tOff = walkRightToBaseline(signal, tIdx, tIdx + T_OFF_WIN, baseline, baselineBand);
      result.t_onsets.push(tOn);
      result.t_offsets.push(tOff);
      if (Number.isFinite(tOff)) prevTOffset = tOff;
    } else {
      result.t_onsets.push(NaNi);
      result.t_offsets.push(NaNi);
    }
  }

  return result;
}

/** Drop NaN entries from a positions array. */
export function compactIndices(arr: number[]): number[] {
  const out: number[] = [];
  for (const v of arr) {
    if (Number.isFinite(v) && v >= 0) out.push(Math.round(v));
  }
  return out;
}

/** Compact every wave in a DelineationData. Use when feeding the chart overlay. */
export function compactDelineation(d: DelineationData): DelineationData {
  return {
    p_onsets: compactIndices(d.p_onsets),
    p_peaks: compactIndices(d.p_peaks),
    p_offsets: compactIndices(d.p_offsets),
    q_peaks: compactIndices(d.q_peaks),
    r_peaks: compactIndices(d.r_peaks),
    s_peaks: compactIndices(d.s_peaks),
    t_onsets: compactIndices(d.t_onsets),
    t_peaks: compactIndices(d.t_peaks),
    t_offsets: compactIndices(d.t_offsets),
  };
}

/**
 * Compute median of finite per-beat intervals (later[i] - earlier[i]) in ms.
 * Returns null if no valid pair exists. Use this for clinical interval cards.
 */
export function medianIntervalMs(
  laterIdx: number[],
  earlierIdx: number[],
  fs: number
): number | null {
  const n = Math.min(laterIdx.length, earlierIdx.length);
  const vals: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = laterIdx[i];
    const b = earlierIdx[i];
    if (Number.isFinite(a) && Number.isFinite(b) && a > b) {
      vals.push(((a - b) / fs) * 1000);
    }
  }
  if (vals.length === 0) return null;
  vals.sort((a, b) => a - b);
  const mid = vals.length >> 1;
  return vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
}

/**
 * Compute median QTc (Bazett) per beat in ms.
 * For each beat i: rr_s = (r[i+1]-r[i])/fs, qtc = qt_s / sqrt(rr_s).
 * Uses paired q_peaks[i] and t_offsets[i] for QT.
 */
export function medianQtcBazettMs(
  qPeaks: number[],
  tOffsets: number[],
  rPeaks: number[],
  fs: number
): number | null {
  const vals: number[] = [];
  const n = Math.min(qPeaks.length, tOffsets.length, rPeaks.length);
  for (let i = 0; i < n; i++) {
    const q = qPeaks[i];
    const tOff = tOffsets[i];
    if (!Number.isFinite(q) || !Number.isFinite(tOff) || tOff <= q) continue;
    // Find an RR for this beat: prefer next R, else previous
    let rrSec: number | null = null;
    if (i + 1 < rPeaks.length && Number.isFinite(rPeaks[i + 1]) && Number.isFinite(rPeaks[i])) {
      rrSec = (rPeaks[i + 1] - rPeaks[i]) / fs;
    } else if (i > 0 && Number.isFinite(rPeaks[i]) && Number.isFinite(rPeaks[i - 1])) {
      rrSec = (rPeaks[i] - rPeaks[i - 1]) / fs;
    }
    if (rrSec == null || rrSec <= 0) continue;
    const qtSec = (tOff - q) / fs;
    vals.push((qtSec / Math.sqrt(rrSec)) * 1000);
  }
  if (vals.length === 0) return null;
  vals.sort((a, b) => a - b);
  const mid = vals.length >> 1;
  return vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
}
