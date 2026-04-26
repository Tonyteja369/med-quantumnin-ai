/**
 * Deterministic ECG waveform generators (offline fallback).
 *
 * Each generator produces a CLINICALLY DISTINCT signal so the downstream
 * delineator + rule engine yields a unique diagnosis per record:
 *
 *   100   → clean Normal Sinus Rhythm, ~75 bpm, regular RR, prominent P
 *   200   → frequent multi-form PVCs (every 4th beat wide, no P)
 *   203   → severe AFib: highly irregular RR, no P waves, fibrillatory baseline
 *   04015 → moderate AFib: irregular RR, absent P, less chaotic than 203
 *   16265 → slow normal sinus with mild RR variation (vagal tone), low-amp
 *
 * Diagnoses are NEVER baked in — they emerge from the computed features.
 */

import type { LeadData } from "@/types/ecg.types";

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s ^= s >>> 16;
    return (s >>> 0) / 0xffffffff;
  };
}

interface BeatParams {
  pAmp: number;
  pWidth: number;
  prSamples: number;
  qAmp: number;
  rAmp: number;
  qrsHalfWidth: number;
  sAmp: number;
  stLevel: number;
  tAmp: number;
  tWidth: number;
  tDelay: number;
}

function renderBeat(out: number[], rIdx: number, p: BeatParams) {
  const n = out.length;
  if (p.pAmp !== 0) {
    const pCenter = rIdx - p.prSamples;
    const span = Math.ceil(p.pWidth * 4);
    for (let i = -span; i <= span; i++) {
      const idx = pCenter + i;
      if (idx < 0 || idx >= n) continue;
      out[idx] += p.pAmp * Math.exp(-(i * i) / (2 * p.pWidth * p.pWidth));
    }
  }
  const half = p.qrsHalfWidth;
  for (let i = -half; i <= 0; i++) {
    const idx = rIdx + i;
    if (idx < 0 || idx >= n) continue;
    const t = (i + half) / half;
    out[idx] += p.qAmp + (p.rAmp - p.qAmp) * t;
  }
  for (let i = 1; i <= half; i++) {
    const idx = rIdx + i;
    if (idx < 0 || idx >= n) continue;
    const t = i / half;
    out[idx] += p.rAmp + (p.sAmp - p.rAmp) * t;
  }
  const tCenter = rIdx + p.tDelay;
  const stStart = rIdx + half + 1;
  const stEnd = tCenter - Math.ceil(p.tWidth * 2);
  for (let idx = stStart; idx < stEnd; idx++) {
    if (idx < 0 || idx >= n) continue;
    out[idx] += p.stLevel;
  }
  const tSpan = Math.ceil(p.tWidth * 4);
  for (let i = -tSpan; i <= tSpan; i++) {
    const idx = tCenter + i;
    if (idx < 0 || idx >= n) continue;
    out[idx] += p.tAmp * Math.exp(-(i * i) / (2 * p.tWidth * p.tWidth));
  }
}

interface SignalSpec {
  totalSamples: number;
  samplingRate: number;
  nextRR: (beatIdx: number, rng: () => number) => number;
  beatAt: (beatIdx: number, rng: () => number) => BeatParams;
  noise: number;
  baseline?: (t: number, rng: () => number) => number;
  leadName: string;
}

function generate(spec: SignalSpec, seed: number): number[] {
  const rng = makeRng(seed);
  const out = new Array<number>(spec.totalSamples).fill(0);
  if (spec.baseline) {
    for (let i = 0; i < out.length; i++) {
      out[i] += spec.baseline(i / spec.samplingRate, rng);
    }
  }
  let cursor = Math.round(spec.samplingRate * 0.4);
  let beatIdx = 0;
  while (cursor < out.length - 50) {
    const params = spec.beatAt(beatIdx, rng);
    renderBeat(out, cursor, params);
    const rr = spec.nextRR(beatIdx, rng);
    cursor += Math.max(40, Math.round(rr));
    beatIdx++;
  }
  if (spec.noise > 0) {
    for (let i = 0; i < out.length; i++) {
      const u1 = Math.max(1e-9, rng());
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      out[i] += z * spec.noise;
    }
  }
  return out;
}

function buildLead(name: string, signal: number[]): LeadData {
  return { name, signal, unit: "mV" };
}

export interface SyntheticRecord {
  samplingRate: number;
  leads: LeadData[];
  recordName: string;
  database: string;
}

/** mitdb/100 — Clean normal sinus rhythm, ~75 bpm, prominent P, very regular. */
export function generateMitdb100(): SyntheticRecord {
  const fs = 360;
  // RR ≈ 800ms (75bpm) at 360Hz = 288 samples, ±4 jitter → CV ~ 0.014 (very regular)
  const sig = generate(
    {
      totalSamples: fs * 30,
      samplingRate: fs,
      leadName: "MLII",
      noise: 0.018,
      nextRR: (_b, rng) => 288 + (rng() * 8 - 4),
      beatAt: () => ({
        pAmp: 0.18,
        pWidth: 14,
        prSamples: 58,
        qAmp: -0.1,
        rAmp: 1.25,
        qrsHalfWidth: 9,
        sAmp: -0.18,
        stLevel: 0.01,
        tAmp: 0.32,
        tWidth: 30,
        tDelay: 110,
      }),
    },
    100
  );
  return { samplingRate: fs, leads: [buildLead("MLII", sig)], recordName: "100", database: "mitdb" };
}

/** mitdb/200 — Frequent multi-form PVCs (every 3rd beat wide, no preceding P). */
export function generateMitdb200(): SyntheticRecord {
  const fs = 360;
  const sig = generate(
    {
      totalSamples: fs * 30,
      samplingRate: fs,
      leadName: "MLII",
      noise: 0.028,
      nextRR: (b, rng) => {
        // every 3rd beat is a PVC: short coupling, then compensatory pause
        if (b > 0 && b % 3 === 2) return 200; // PVC fires early (couples short)
        if (b > 0 && b % 3 === 0 && b > 1) return 360; // post-PVC compensatory pause
        return 270 + (rng() * 10 - 5);
      },
      beatAt: (b) => {
        if (b > 0 && b % 3 === 2) {
          // PVC: wide bizarre QRS, no P, inverted T
          return {
            pAmp: 0,
            pWidth: 12,
            prSamples: 58,
            qAmp: -0.4,
            rAmp: 1.9,
            qrsHalfWidth: 24, // ~133 ms wide → triggers PVC detector
            sAmp: -0.5,
            stLevel: -0.1,
            tAmp: -0.4,
            tWidth: 38,
            tDelay: 140,
          };
        }
        return {
          pAmp: 0.16,
          pWidth: 13,
          prSamples: 58,
          qAmp: -0.1,
          rAmp: 1.2,
          qrsHalfWidth: 9,
          sAmp: -0.16,
          stLevel: 0.01,
          tAmp: 0.28,
          tWidth: 28,
          tDelay: 110,
        };
      },
    },
    200
  );
  return { samplingRate: fs, leads: [buildLead("MLII", sig)], recordName: "200", database: "mitdb" };
}

/** mitdb/203 — Severe AFib: highly irregular RR, NO P waves, fibrillatory baseline. */
export function generateMitdb203(): SyntheticRecord {
  const fs = 360;
  const sig = generate(
    {
      totalSamples: fs * 30,
      samplingRate: fs,
      leadName: "MLII",
      noise: 0.05,
      // fibrillatory waves on baseline (~6 Hz)
      baseline: (t, rng) =>
        0.09 * Math.sin(2 * Math.PI * 6.2 * t) * (0.6 + 0.4 * rng()) +
        0.04 * Math.sin(2 * Math.PI * 9.3 * t + rng()),
      // Wildly irregular RR: 380–820 ms at 360Hz = 137–295 samples
      nextRR: (_b, rng) => 137 + rng() * 158,
      beatAt: (b, rng) => {
        const aberrant = b > 0 && b % 6 === 5;
        return {
          pAmp: 0, // NO P waves
          pWidth: 10,
          prSamples: 58,
          qAmp: -0.08,
          rAmp: aberrant ? 1.55 : 1.0 + rng() * 0.45,
          qrsHalfWidth: aberrant ? 20 : 8 + Math.round(rng() * 2),
          sAmp: -0.13,
          stLevel: rng() * 0.05 - 0.025,
          tAmp: aberrant ? -0.28 : 0.18 + rng() * 0.12,
          tWidth: 25,
          tDelay: 120,
        };
      },
    },
    203
  );
  return { samplingRate: fs, leads: [buildLead("MLII", sig)], recordName: "203", database: "mitdb" };
}

/** afdb/04015 — Moderate AFib: irregular RR, absent P, less extreme than 203. */
export function generateAfdb04015(): SyntheticRecord {
  const fs = 250;
  const sig = generate(
    {
      totalSamples: fs * 30,
      samplingRate: fs,
      leadName: "ECG1",
      noise: 0.028,
      baseline: (t, rng) => 0.06 * Math.sin(2 * Math.PI * 5.8 * t + rng() * Math.PI),
      // RR 380–820 ms at 250Hz = 95–205 samples → CV ~ 0.22 (moderate AFib)
      nextRR: (_b, rng) => 95 + rng() * 110,
      beatAt: (_b, rng) => ({
        pAmp: 0, // absent P
        pWidth: 8,
        prSamples: 40,
        qAmp: -0.07,
        rAmp: 0.95 + rng() * 0.25,
        qrsHalfWidth: 7 + Math.round(rng() * 2),
        sAmp: -0.1,
        stLevel: 0,
        tAmp: 0.2 + rng() * 0.06,
        tWidth: 18,
        tDelay: 85,
      }),
    },
    4015
  );
  return { samplingRate: fs, leads: [buildLead("ECG1", sig)], recordName: "04015", database: "afdb" };
}

/** nsrdb/16265 — Normal sinus, slower (~62 bpm) with mild RR variation. */
export function generateNsrdb16265(): SyntheticRecord {
  const fs = 128;
  // RR ≈ 970ms → 124 samples, ±5 jitter (slight respiratory sinus arrhythmia)
  const sig = generate(
    {
      totalSamples: fs * 30,
      samplingRate: fs,
      leadName: "ECG1",
      noise: 0.014,
      nextRR: (b, rng) => 124 + Math.sin(b * 0.6) * 6 + (rng() * 4 - 2),
      beatAt: () => ({
        pAmp: 0.13,
        pWidth: 5,
        prSamples: 22,
        qAmp: -0.07,
        rAmp: 0.9,
        qrsHalfWidth: 4,
        sAmp: -0.1,
        stLevel: 0.005,
        tAmp: 0.22,
        tWidth: 11,
        tDelay: 40,
      }),
    },
    16265
  );
  return { samplingRate: fs, leads: [buildLead("ECG1", sig)], recordName: "16265", database: "nsrdb" };
}

export const SYNTHETIC_GENERATORS: Record<string, () => SyntheticRecord> = {
  "100": generateMitdb100,
  "200": generateMitdb200,
  "203": generateMitdb203,
  "04015": generateAfdb04015,
  "16265": generateNsrdb16265,
};
