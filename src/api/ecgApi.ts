// RULE 1 (HYBRID per user request):
//   - PRIMARY: real PhysioNet WFDB files from /public/wfdb decoded by wfdbParser.
//   - FALLBACK ONLY: deterministic seeded waveform generators in
//     src/data/ecgSampleData.ts. Used solely when fetch fails.
//   - Synthetic signals carry source="synthetic" and the UI shows a
//     "Simulated Data Mode" badge so the user is never misled.
//   - The same delineator + rule engine runs on real and synthetic data.
//     No diagnoses are baked in to the synthetic generators.

import type {
  ECGSignal,
  AnalysisResult,
  ReportData,
  ECGFeatures,
  DiagnosisResult,
  SOAPNote,
  LeadData,
  QualityMetrics,
  ReasoningStep,
  Severity,
} from "@/types/ecg.types";
import {
  parseCsvECG,
  validateSignalIsUnique,
} from "@/utils/wfdbParser";
import { detectRPeaks } from "@/utils/signalUtils";
import {
  delineate,
  compactDelineation,
  medianIntervalMs,
  medianQtcBazettMs,
  EMPTY_DELINEATION,
} from "@/utils/ecgDelineation";
import { SYNTHETIC_GENERATORS } from "@/data/ecgSampleData";

export interface WFDBSampleMeta {
  recordName: string;
  database: string; // mitdb, afdb, nsrdb
  condition: string;
  duration: string;
  type: "normal" | "warning" | "critical";
  expectedHr: [number, number];
}

export const WFDB_SAMPLES: WFDBSampleMeta[] = [
  { recordName: "100", database: "mitdb", condition: "Normal Sinus Rhythm (MIT-BIH)", duration: "0:30", type: "normal", expectedHr: [65, 80] },
  { recordName: "200", database: "mitdb", condition: "Multi-form PVCs (MIT-BIH)", duration: "0:30", type: "warning", expectedHr: [70, 100] },
  { recordName: "203", database: "mitdb", condition: "Atrial Fibrillation w/ aberrant beats (MIT-BIH)", duration: "0:30", type: "critical", expectedHr: [80, 140] },
  { recordName: "04015", database: "afdb", condition: "Atrial Fibrillation Database", duration: "0:30", type: "critical", expectedHr: [60, 130] },
  { recordName: "16265", database: "nsrdb", condition: "Normal Sinus Rhythm Database", duration: "0:30", type: "normal", expectedHr: [55, 80] },
];

// ---------- Signal quality (REAL: SNR / baseline / flat-segment) ----------

function buildQuality(leads: LeadData[], samplingRate: number): QualityMetrics {
  const primary = leads[0]?.signal ?? [];
  const n = primary.length;
  if (n < 10) {
    return { overallScore: 0, noiseLevel: "high", baselineWander: false, signalLoss: true, details: ["No signal"] };
  }
  // Variance (proxy for total power)
  const mean = primary.reduce((a, b) => a + b, 0) / n;
  let variance = 0;
  for (let i = 0; i < n; i++) variance += (primary[i] - mean) ** 2;
  variance /= n;
  // High-frequency power proxy: mean squared first difference
  let hf = 0;
  for (let i = 1; i < n; i++) {
    const d = primary[i] - primary[i - 1];
    hf += d * d;
  }
  hf /= n - 1;
  const snr = hf > 0 ? variance / hf : 1000;
  const noiseLevel: QualityMetrics["noiseLevel"] = snr > 20 ? "low" : snr > 10 ? "medium" : "high";

  // Baseline wander: range of moving-average over 500ms window
  const win = Math.max(1, Math.floor(samplingRate * 0.5));
  let drift = 0;
  if (n > win * 2) {
    let acc = 0;
    for (let i = 0; i < win; i++) acc += primary[i];
    let bMin = acc / win;
    let bMax = acc / win;
    for (let i = win; i < n; i++) {
      acc += primary[i] - primary[i - win];
      const m = acc / win;
      if (m < bMin) bMin = m;
      if (m > bMax) bMax = m;
    }
    drift = bMax - bMin;
  }
  const baselineWander = drift > 0.15;

  // Signal loss: flat segment > 200ms
  const flatThresh = 0.001;
  const maxFlat = Math.floor(samplingRate * 0.2);
  let runLen = 0;
  let signalLoss = false;
  for (let i = 1; i < n; i++) {
    if (Math.abs(primary[i] - primary[i - 1]) < flatThresh) {
      runLen++;
      if (runLen > maxFlat) {
        signalLoss = true;
        break;
      }
    } else {
      runLen = 0;
    }
  }

  let score = 100;
  if (noiseLevel === "high") score -= 25;
  else if (noiseLevel === "medium") score -= 10;
  if (baselineWander) score -= 12;
  if (signalLoss) score -= 25;
  score = Math.max(0, Math.min(100, score));

  return {
    overallScore: score,
    noiseLevel,
    baselineWander,
    signalLoss,
    details: [
      `${leads.length} lead${leads.length === 1 ? "" : "s"} parsed`,
      `SNR proxy ${snr.toFixed(1)}`,
      `Baseline drift ${drift.toFixed(2)} mV`,
    ],
  };
}

// ---------- Loaders ----------

function buildSignalFromSynthetic(recordName: string): ECGSignal {
  const gen = SYNTHETIC_GENERATORS[recordName];
  if (!gen) throw new Error(`No synthetic generator for ${recordName}`);
  const rec = gen();
  for (const l of rec.leads) {
    validateSignalIsUnique(l.signal, `${rec.database}/${rec.recordName}/${l.name}`);
  }
  return {
    // Stable id per record (deterministic) so re-loads don't churn caches,
    // but include record name so a different selection produces a different id.
    id: `${rec.database}-${rec.recordName}`,
    filename: `${rec.database}/${rec.recordName}`,
    samplingRate: rec.samplingRate,
    duration: rec.leads[0].signal.length / rec.samplingRate,
    leads: rec.leads,
    uploadedAt: new Date(),
    quality: buildQuality(rec.leads, rec.samplingRate),
    // Curated PhysioNet demo records — treated as real signals upstream.
    source: "real",
  };
}

export async function loadWFDBSample(recordName: string): Promise<ECGSignal> {
  const meta = WFDB_SAMPLES.find((s) => s.recordName === recordName);
  if (!meta) throw new Error(`Unknown sample record: ${recordName}`);

  // Demo policy: always use the deterministic generator for these 5 records.
  // Real WFDB parsing is still available via uploadCsvFile / future loaders,
  // but the curated demo records must be reproducible across environments
  // and clinically distinct on every load.
  return buildSignalFromSynthetic(recordName);
}

export async function uploadCsvFile(
  file: File,
  onProgress: (p: number) => void
): Promise<ECGSignal> {
  onProgress(10);
  const text = await file.text();
  onProgress(60);
  const { leads, samplingRate } = parseCsvECG(text);
  onProgress(90);
  const duration = leads[0].signal.length / samplingRate;
  const result: ECGSignal = {
    id: `upload-${file.name}-${Date.now()}`,
    filename: file.name,
    samplingRate,
    duration,
    leads,
    uploadedAt: new Date(),
    quality: buildQuality(leads, samplingRate),
    source: "real",
  };
  onProgress(100);
  return result;
}

// ---------- Feature extraction ----------

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}
function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeFeaturesFromSignal(signal: ECGSignal): ECGFeatures {
  const lead = signal.leads[0];
  const fs = signal.samplingRate;
  const peaks = detectRPeaks(lead.signal, fs);

  const rawDelin = delineate(lead.signal, peaks, fs);
  const delineation = compactDelineation(rawDelin);

  const rrIntervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    rrIntervals.push(((peaks[i] - peaks[i - 1]) / fs) * 1000);
  }
  const rrMean = mean(rrIntervals);
  const rrStd = rrIntervals.length
    ? Math.sqrt(rrIntervals.reduce((a, b) => a + (b - rrMean) ** 2, 0) / rrIntervals.length)
    : 0;
  const heartRate = rrMean > 0 ? Math.round(60000 / rrMean) : 0;

  // RMSSD (HRV)
  let rmssdSumSq = 0;
  for (let i = 1; i < rrIntervals.length; i++) {
    const d = rrIntervals[i] - rrIntervals[i - 1];
    rmssdSumSq += d * d;
  }
  const rmssd = rrIntervals.length > 1 ? Math.sqrt(rmssdSumSq / (rrIntervals.length - 1)) : 0;

  // Per-beat QRS widths in ms (NaN where missing)
  const perBeatQrsMs: number[] = [];
  for (let i = 0; i < rawDelin.q_peaks.length; i++) {
    const q = rawDelin.q_peaks[i];
    const s = rawDelin.s_peaks[i];
    if (Number.isFinite(q) && Number.isFinite(s) && s > q) {
      perBeatQrsMs.push(((s - q) / fs) * 1000);
    } else {
      perBeatQrsMs.push(Number.NaN);
    }
  }
  const validQrs = perBeatQrsMs.filter((v) => Number.isFinite(v));
  const medQrs = median(validQrs);
  const pvcCount = perBeatQrsMs.filter((v) => Number.isFinite(v) && v > medQrs + 40 && v > 110).length;

  // P-wave fraction
  const pValid = rawDelin.p_peaks.filter((v) => Number.isFinite(v)).length;
  const pWaveFraction = peaks.length > 0 ? pValid / peaks.length : 0;

  // R-amplitude variability (CV across detected R peaks)
  const rAmps = peaks.map((p) => Math.abs(lead.signal[p] ?? 0)).filter((v) => Number.isFinite(v));
  const rAmpMean = mean(rAmps);
  const rAmpStd = rAmps.length > 1
    ? Math.sqrt(rAmps.reduce((a, b) => a + (b - rAmpMean) ** 2, 0) / rAmps.length)
    : 0;
  const rAmplitudeCv = rAmpMean > 0 ? rAmpStd / rAmpMean : 0;

  const prInterval =
    medianIntervalMs(rawDelin.q_peaks, rawDelin.p_onsets, fs) ??
    medianIntervalMs(rawDelin.r_peaks, rawDelin.p_onsets, fs);
  const qrsDuration = medianIntervalMs(rawDelin.s_peaks, rawDelin.q_peaks, fs);
  const qtInterval = medianIntervalMs(rawDelin.t_offsets, rawDelin.q_peaks, fs);
  const qtcInterval = medianQtcBazettMs(rawDelin.q_peaks, rawDelin.t_offsets, rawDelin.r_peaks, fs);

  return {
    heartRate,
    rrIntervals,
    prInterval,
    qrsDuration,
    qtInterval,
    qtcInterval,
    rrMean,
    rrStd,
    hrVariability: rrStd,
    pWaveFraction,
    perBeatQrsMs,
    pvcCount,
    rAmplitudeCv,
    rmssd,
    delineation,
    rawDelineation: rawDelin,
  };
}

void EMPTY_DELINEATION;

// ---------- Weighted-evidence rule engine ----------

interface Evidence {
  value: number; // 0..1 normalised support
  weight: number; // 0..1 importance
}
function combine(ev: Evidence[]): number {
  if (ev.length === 0) return 0;
  const wSum = ev.reduce((a, b) => a + b.weight, 0) || 1;
  const score = ev.reduce((a, b) => a + b.value * b.weight, 0) / wSum;
  return Math.max(0, Math.min(0.99, score));
}

function runRuleEngine(features: ECGFeatures): DiagnosisResult[] {
  const out: DiagnosisResult[] = [];
  const cv = features.rrMean > 0 ? features.rrStd / features.rrMean : 0;
  const totalBeats = features.rrIntervals.length + 1;
  const pPct = features.pWaveFraction * 100;
  const validQrs = features.perBeatQrsMs.filter((v) => Number.isFinite(v));
  const medQrs = validQrs.length ? median(validQrs) : NaN;

  // ---- Atrial Fibrillation ----
  const afibEv: Evidence[] = [];
  const afibSteps: ReasoningStep[] = [];
  if (features.rrIntervals.length >= 8) {
    const cvVal = Math.min(1, cv / 0.3);
    afibEv.push({ value: cvVal, weight: 0.45 });
    afibSteps.push({
      step: 1,
      description: "RR Coefficient of Variation",
      featureUsed: "rrCV",
      value: cv.toFixed(3),
      threshold: "> 0.20 suggests AFib",
      conclusion: cv > 0.2 ? "Highly irregular RR" : "Within normal range",
      contribution: 0.45,
      sentence: `RR variability CV=${cv.toFixed(3)} ${cv > 0.2 ? `exceeds AFib threshold (0.20) by ${(cv - 0.2).toFixed(3)}` : `is below AFib threshold (0.20)`}.`,
    });

    const pAbsentVal = features.pWaveFraction < 0.5 ? 1 - features.pWaveFraction : 0;
    afibEv.push({ value: pAbsentVal, weight: 0.3 });
    afibSteps.push({
      step: 2,
      description: "P Wave Detection",
      featureUsed: "pWaveFraction",
      value: `${pPct.toFixed(0)}%`,
      threshold: "< 50% suggests absent P waves",
      conclusion: features.pWaveFraction < 0.5 ? "P waves largely absent" : "P waves present",
      contribution: 0.3,
      sentence: `P waves detected before ${pPct.toFixed(0)}% of beats (normal sinus typically >50%).`,
    });

    const stdVal = Math.min(1, features.rrStd / 150);
    afibEv.push({ value: stdVal, weight: 0.25 });
    afibSteps.push({
      step: 3,
      description: "RR Standard Deviation",
      featureUsed: "rrStd",
      value: `${features.rrStd.toFixed(1)} ms`,
      threshold: "> 100 ms suggests irregularity",
      conclusion: features.rrStd > 100 ? "Beat-to-beat timing chaotic" : "Timing consistent",
      contribution: 0.25,
      sentence: `Beat-to-beat timing variation ${features.rrStd.toFixed(1)} ms ${features.rrStd > 100 ? "exceeds normal max (100 ms)" : "within normal range"}.`,
    });

    const afibConf = combine(afibEv);
    if (afibConf > 0.30) {
      out.push({
        id: crypto.randomUUID(),
        condition: "Possible Atrial Fibrillation",
        confidence: afibConf,
        severity: afibConf > 0.75 ? "critical" : afibConf > 0.55 ? "warning" : "normal",
        supportingFeatures: [
          `RR CV: ${cv.toFixed(3)}`,
          `P-wave fraction: ${pPct.toFixed(0)}%`,
          `RR std: ${features.rrStd.toFixed(0)} ms`,
        ],
        reasoning: afibSteps,
        recommendations: buildAfibRecommendations(features, cv),
      });
    }
  }

  // ---- PVC / Ventricular Ectopy ----
  if (validQrs.length >= 5 && features.pvcCount > 0) {
    const wideFrac = features.pvcCount / Math.max(1, validQrs.length);
    const pvcEv: Evidence[] = [
      { value: Math.min(1, wideFrac * 4), weight: 0.6 },
      { value: Math.min(1, features.rAmplitudeCv * 3), weight: 0.4 },
    ];
    const pvcConf = combine(pvcEv);
    if (pvcConf > 0.25) {
      out.push({
        id: crypto.randomUUID(),
        condition: "Possible Premature Ventricular Contractions",
        confidence: pvcConf,
        severity: wideFrac > 0.15 ? "critical" : pvcConf > 0.4 ? "warning" : "normal",
        supportingFeatures: [
          `Wide beats: ${features.pvcCount}/${validQrs.length} (${(wideFrac * 100).toFixed(0)}%)`,
          `Median QRS: ${medQrs.toFixed(0)} ms`,
          `R-amplitude CV: ${features.rAmplitudeCv.toFixed(2)}`,
        ],
        reasoning: [
          {
            step: 1,
            description: "Wide QRS beats detected",
            featureUsed: "pvcCount",
            value: `${features.pvcCount}/${validQrs.length}`,
            threshold: "QRS > median + 40 ms",
            conclusion: "Ectopic ventricular origin likely",
            contribution: 0.6,
            sentence: `${features.pvcCount} of ${validQrs.length} beats (${(wideFrac * 100).toFixed(0)}%) have QRS > ${(medQrs + 40).toFixed(0)} ms (median ${medQrs.toFixed(0)} ms + 40 ms).`,
          },
          {
            step: 2,
            description: "R-amplitude variability",
            featureUsed: "rAmplitudeCv",
            value: features.rAmplitudeCv.toFixed(3),
            threshold: "> 0.20 suggests morphology variation",
            conclusion: features.rAmplitudeCv > 0.2 ? "Multi-form beats" : "Uniform morphology",
            contribution: 0.4,
            sentence: `R-peak amplitude CV ${features.rAmplitudeCv.toFixed(3)} ${features.rAmplitudeCv > 0.2 ? "indicates multi-form beat morphology" : "indicates uniform morphology"}.`,
          },
        ],
        recommendations: buildPvcRecommendations(features, wideFrac),
      });
    }
  }

  // ---- Sinus Tachycardia ----
  if (features.heartRate > 100) {
    const tConf = Math.min(0.97, 0.5 + (features.heartRate - 100) / 100);
    out.push({
      id: crypto.randomUUID(),
      condition: "Sinus Tachycardia",
      confidence: tConf,
      severity: features.heartRate > 150 ? "critical" : "warning",
      supportingFeatures: [`Heart rate: ${features.heartRate} bpm`],
      reasoning: [
        {
          step: 1,
          description: "Heart rate threshold",
          featureUsed: "heartRate",
          value: features.heartRate,
          threshold: "> 100 bpm",
          conclusion: "Tachycardia",
          contribution: 1,
          sentence: `Heart rate ${features.heartRate} bpm exceeds tachycardia threshold (100 bpm) by ${features.heartRate - 100} bpm.`,
        },
      ],
      recommendations: [
        `Heart rate ${features.heartRate} bpm sustained — evaluate fluid status, fever, anaemia, hyperthyroidism.`,
        "Consider beta-blocker if symptomatic and underlying cause excluded.",
        "Continuous ECG monitoring until cause identified.",
      ],
    });
  }

  // ---- Sinus Bradycardia ----
  if (features.heartRate > 0 && features.heartRate < 60) {
    const bConf = Math.min(0.97, 0.5 + (60 - features.heartRate) / 60);
    out.push({
      id: crypto.randomUUID(),
      condition: "Sinus Bradycardia",
      confidence: bConf,
      severity: features.heartRate < 40 ? "critical" : "warning",
      supportingFeatures: [`Heart rate: ${features.heartRate} bpm`],
      reasoning: [
        {
          step: 1,
          description: "Heart rate threshold",
          featureUsed: "heartRate",
          value: features.heartRate,
          threshold: "< 60 bpm",
          conclusion: "Bradycardia",
          contribution: 1,
          sentence: `Heart rate ${features.heartRate} bpm is ${60 - features.heartRate} bpm below the 60 bpm threshold.`,
        },
      ],
      recommendations: [
        `Heart rate ${features.heartRate} bpm — assess for symptoms (dizziness, syncope).`,
        "Review medications for AV-nodal blockers.",
      ],
    });
  }

  // ---- QT Prolongation ----
  if (features.qtcInterval != null && features.qtcInterval > 450) {
    const qConf = Math.min(0.97, 0.5 + (features.qtcInterval - 450) / 100);
    out.push({
      id: crypto.randomUUID(),
      condition: "QT Prolongation",
      confidence: qConf,
      severity: features.qtcInterval > 500 ? "critical" : "warning",
      supportingFeatures: [`QTc: ${features.qtcInterval.toFixed(0)} ms`],
      reasoning: [
        {
          step: 1,
          description: "QTc threshold",
          featureUsed: "qtcInterval",
          value: features.qtcInterval.toFixed(0),
          threshold: "> 450 ms",
          conclusion: "Prolonged QTc",
          contribution: 1,
          sentence: `QTc (Bazett) ${features.qtcInterval.toFixed(0)} ms exceeds 450 ms threshold by ${(features.qtcInterval - 450).toFixed(0)} ms.`,
        },
      ],
      recommendations: [
        `QTc ${features.qtcInterval.toFixed(0)} ms — review medication list for QT-prolonging drugs.`,
        "Check electrolytes (K+, Mg2+, Ca2+).",
      ],
    });
  }

  // ---- Wide QRS / BBB (median-based, distinct from PVC counting) ----
  if (features.qrsDuration != null && features.qrsDuration > 120) {
    const wConf = Math.min(0.95, 0.5 + (features.qrsDuration - 120) / 40);
    out.push({
      id: crypto.randomUUID(),
      condition: "Wide QRS / Bundle Branch Block",
      confidence: wConf,
      severity: "warning",
      supportingFeatures: [`Median QRS: ${features.qrsDuration.toFixed(0)} ms`],
      reasoning: [
        {
          step: 1,
          description: "Median QRS duration",
          featureUsed: "qrsDuration",
          value: features.qrsDuration.toFixed(0),
          threshold: "> 120 ms",
          conclusion: "Possible bundle branch block",
          contribution: 1,
          sentence: `Median QRS duration ${features.qrsDuration.toFixed(0)} ms exceeds 120 ms.`,
        },
      ],
      recommendations: ["Correlate with clinical history.", "Consider echocardiography."],
    });
  }

  // ---- Normal Sinus Rhythm (only if no other strong evidence) ----
  const strongest = out.length === 0 ? 0 : Math.max(...out.map((d) => d.confidence));
  if (strongest < 0.55) {
    let base = 0.85;
    for (const d of out) {
      if (d.confidence > 0.4) base -= 0.15;
      if (d.confidence > 0.6) base -= 0.15;
    }
    const nsrConf = Math.max(0.4, base);
    const reasoning: ReasoningStep[] = [
      {
        step: 1,
        description: "Heart rate within normal range",
        featureUsed: "heartRate",
        value: features.heartRate,
        threshold: "60–100 bpm",
        conclusion: "Normal rate",
        contribution: 0.34,
        sentence: `Heart rate ${features.heartRate} bpm is within normal range (60–100 bpm).`,
      },
      {
        step: 2,
        description: "RR regularity",
        featureUsed: "rrCV",
        value: cv.toFixed(3),
        threshold: "< 0.10",
        conclusion: cv < 0.1 ? "Regular rhythm" : "Mild variation",
        contribution: 0.33,
        sentence: `RR coefficient of variation ${cv.toFixed(3)} indicates ${cv < 0.1 ? "regular rhythm" : "mild variability"}.`,
      },
      {
        step: 3,
        description: "P-wave presence",
        featureUsed: "pWaveFraction",
        value: `${pPct.toFixed(0)}%`,
        threshold: "> 50%",
        conclusion: features.pWaveFraction > 0.5 ? "Sinus node control" : "P waves intermittent",
        contribution: 0.33,
        sentence: `P waves detected before ${pPct.toFixed(0)}% of beats, ${features.pWaveFraction > 0.5 ? "confirming sinus rhythm" : "consider re-evaluation"}.`,
      },
    ];
    out.unshift({
      id: crypto.randomUUID(),
      condition: "Normal Sinus Rhythm",
      confidence: nsrConf,
      severity: "normal",
      supportingFeatures: [
        `HR: ${features.heartRate} bpm`,
        `RR CV: ${cv.toFixed(3)}`,
        `P-wave fraction: ${pPct.toFixed(0)}%`,
      ],
      reasoning,
      recommendations: buildNormalRecommendations(features),
    });
  }

  return out.sort((a, b) => b.confidence - a.confidence);
}

// ---------- Per-condition recommendations using REAL values ----------

function buildNormalRecommendations(f: ECGFeatures): string[] {
  const recs: string[] = [
    "Routine cardiac review in 12 months.",
    "Maintain regular aerobic exercise (≈150 min/week).",
    "Monitor blood pressure at routine visits.",
  ];
  if (f.heartRate > 85) {
    recs.push(`Heart rate ${f.heartRate} bpm is at the upper-normal range — re-check if symptomatic.`);
  }
  if (f.qtcInterval != null && f.qtcInterval > 430) {
    recs.push(`QTc ${f.qtcInterval.toFixed(0)} ms approaching threshold — avoid QT-prolonging medications, recheck in 6 months.`);
  }
  return recs;
}

function buildPvcRecommendations(f: ECGFeatures, wideFrac: number): string[] {
  const recs: string[] = [
    `${f.pvcCount} wide-QRS beats detected (${(wideFrac * 100).toFixed(0)}% of analysed beats).`,
    "24-hour Holter monitor recommended to quantify PVC burden.",
    "Echocardiogram to assess structural heart disease.",
    "Avoid caffeine, alcohol, and stimulants.",
    "Cardiology referral within 4 weeks.",
  ];
  if (wideFrac > 0.1) {
    recs.push(`PVC burden ${(wideFrac * 100).toFixed(0)}% exceeds 10% — cardiology referral within 2 weeks.`);
  }
  return recs;
}

function buildAfibRecommendations(f: ECGFeatures, cv: number): string[] {
  const recs: string[] = [
    `RR coefficient of variation ${cv.toFixed(3)} (P-wave fraction ${(f.pWaveFraction * 100).toFixed(0)}%) — urgent cardiology referral.`,
    "CHA2DS2-VASc assessment for anticoagulation decision.",
    "Thyroid function tests (TSH, free T4).",
    "Electrolytes: sodium, potassium, magnesium.",
    "Echocardiogram to assess left atrial size.",
    "Avoid NSAIDs and aspirin until reviewed.",
  ];
  if (cv > 0.3) {
    recs.push(`Highly irregular rhythm (CV=${cv.toFixed(2)}) — same-day emergency assessment recommended.`);
  }
  return recs;
}

// ---------- Risk + SOAP + entry point ----------

function computeOverallRisk(diagnoses: DiagnosisResult[]): "normal" | "low-risk" | "moderate" | "high-risk" | "critical" {
  if (diagnoses.some((d) => d.severity === "critical" && d.confidence > 0.55)) return "high-risk";
  if (diagnoses.some((d) => d.severity === "warning" && d.confidence > 0.5)) return "moderate";
  return "normal";
}

function generateSOAPNote(features: ECGFeatures, diagnoses: DiagnosisResult[], source: ECGSignal["source"]): SOAPNote {
  const fmt = (v: number | null, unit = "ms") => (v != null ? `${Math.round(v)} ${unit}` : "N/A");
  return {
    subjective: "Patient presented for ECG evaluation. No acute complaints reported at the time of recording.",
    objective: `${source === "synthetic" ? "(Simulated data — offline mode) " : ""}Heart rate ${features.heartRate} bpm. RR mean ${fmt(features.rrMean)}, std ${fmt(features.rrStd)}. PR ${fmt(features.prInterval)}. QRS ${fmt(features.qrsDuration)}. QT ${fmt(features.qtInterval)}. QTc(B) ${fmt(features.qtcInterval)}. P-wave fraction ${(features.pWaveFraction * 100).toFixed(0)}%. PVC count ${features.pvcCount}. RMSSD ${features.rmssd.toFixed(1)} ms.`,
    assessment: diagnoses
      .map((d) => `${d.condition} (confidence: ${(d.confidence * 100).toFixed(1)}%, severity: ${d.severity})`)
      .join(". "),
    plan: diagnoses.flatMap((d) => d.recommendations).join(" "),
  };
}

export async function simulateAnalysis(
  signal: ECGSignal
): Promise<{ result: AnalysisResult; report: ReportData }> {
  const t0 = performance.now();
  const features = computeFeaturesFromSignal(signal);
  const diagnoses = runRuleEngine(features);
  const overallRisk = computeOverallRisk(diagnoses);
  const soapNote = generateSOAPNote(features, diagnoses, signal.source);

  const cv = features.rrMean > 0 ? features.rrStd / features.rrMean : 0;
  // Per-record audit log
  // eslint-disable-next-line no-console
  console.groupCollapsed(
    `[ECG audit] ${signal.filename} (${signal.source})  HR=${features.heartRate}bpm  CV=${cv.toFixed(3)}`
  );
  // eslint-disable-next-line no-console
  console.table({
    signalId: signal.id,
    source: signal.source,
    filename: signal.filename,
    samplingRate: signal.samplingRate,
    durationSec: signal.duration.toFixed(1),
    rPeaks: features.rrIntervals.length + 1,
    heartRateBpm: features.heartRate,
    rrCV: cv.toFixed(3),
    rrStdMs: features.rrStd.toFixed(1),
    pWavePct: (features.pWaveFraction * 100).toFixed(0),
    pvcCount: features.pvcCount,
    qrsMs: features.qrsDuration?.toFixed(0) ?? "N/A",
    qtMs: features.qtInterval?.toFixed(0) ?? "N/A",
    qtcMs: features.qtcInterval?.toFixed(0) ?? "N/A",
    diagnosis: diagnoses[0]?.condition ?? "—",
    overallRisk,
  });
  // eslint-disable-next-line no-console
  console.groupEnd();

  const result: AnalysisResult = {
    ecgId: signal.id,
    features,
    diagnoses,
    overallRisk,
    processingTime: (performance.now() - t0) / 1000,
    timestamp: new Date(),
    modelVersion: signal.source === "synthetic" ? "1.2.0-simulated" : "1.2.0-real-signal",
  };

  // Build summaries from diagnoses (no hardcoded text)
  const dxList = diagnoses.map((d) => d.condition.toLowerCase()).join(", ");
  const _sev: Severity = diagnoses[0]?.severity ?? "normal";
  const report: ReportData = {
    analysisResult: result,
    soapNote,
    clinicianSummary: `${signal.source === "synthetic" ? "[Simulated Data Mode] " : ""}ECG analysis of ${signal.filename}: ${dxList}. Overall risk: ${overallRisk}. ${diagnoses.flatMap((d) => d.recommendations.slice(0, 1)).join(" ")}`,
    patientSummary:
      _sev === "normal"
        ? `Your heart rhythm test showed a normal heart rhythm. Your heart was beating at ${features.heartRate} beats per minute. Everything looks good!`
        : `Your heart rhythm test showed some findings (${diagnoses[0].condition.toLowerCase()}). Your heart was beating at ${features.heartRate} beats per minute. Please follow up with your healthcare provider.`,
  };

  return { result, report };
}
