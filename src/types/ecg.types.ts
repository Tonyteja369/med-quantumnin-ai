export interface LeadData {
  name: string;
  signal: number[];
  unit: string;
}

export interface QualityMetrics {
  overallScore: number;
  noiseLevel: "low" | "medium" | "high";
  baselineWander: boolean;
  signalLoss: boolean;
  details: string[];
}

export interface ECGSignal {
  id: string;
  filename: string;
  samplingRate: number;
  duration: number;
  leads: LeadData[];
  uploadedAt: Date;
  quality: QualityMetrics;
  /** "real" = PhysioNet WFDB / user CSV. "synthetic" = offline fallback. */
  source: "real" | "synthetic";
}

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

export interface ECGFeatures {
  heartRate: number;
  rrIntervals: number[];
  prInterval: number | null;
  qrsDuration: number | null;
  qtInterval: number | null;
  qtcInterval: number | null;
  rrMean: number;
  rrStd: number;
  hrVariability: number;
  /** Fraction of beats (0..1) where a valid P peak was detected. */
  pWaveFraction: number;
  /** Per-beat QRS widths in ms (NaN where Q or S missing). */
  perBeatQrsMs: number[];
  /** Number of beats whose QRS width exceeds median + 40 ms. */
  pvcCount: number;
  /** Median absolute deviation of R-peak amplitudes / mean R amplitude. */
  rAmplitudeCv: number;
  /** RMSSD (HRV time-domain) in ms. */
  rmssd: number;
  /** Compacted indices (NaN dropped) — safe for the chart overlay. */
  delineation: DelineationData;
  /**
   * Raw per-beat indices, parallel arrays aligned by beat index, with NaN
   * preserved where a wave couldn't be located. Use for paired interval math.
   */
  rawDelineation: DelineationData;
}

export interface ReasoningStep {
  step: number;
  description: string;
  featureUsed: string;
  value: number | string;
  threshold: string;
  conclusion: string;
  /** Weight 0..1 contribution of this step toward the diagnosis confidence. */
  contribution?: number;
  /** Pre-rendered sentence using actual computed values. */
  sentence?: string;
}

export type Severity = "normal" | "warning" | "critical";
export type RiskLevel = "normal" | "low-risk" | "moderate" | "high-risk" | "critical";

export interface DiagnosisResult {
  id: string;
  condition: string;
  confidence: number;
  severity: Severity;
  supportingFeatures: string[];
  reasoning: ReasoningStep[];
  recommendations: string[];
}

export interface AnalysisResult {
  ecgId: string;
  features: ECGFeatures;
  diagnoses: DiagnosisResult[];
  overallRisk: RiskLevel;
  processingTime: number;
  timestamp: Date;
  modelVersion: string;
}

export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface ReportData {
  analysisResult: AnalysisResult;
  patientContext?: Record<string, string>;
  soapNote: SOAPNote;
  clinicianSummary: string;
  patientSummary: string;
}

export type UploadStatus = "idle" | "uploading" | "processing" | "complete" | "error";
export type AnalysisStatus = "idle" | "analyzing" | "complete" | "error";

export interface UploadState {
  status: UploadStatus;
  progress: number;
  error: string | null;
  signal: ECGSignal | null;
}

export interface AnalysisState {
  status: AnalysisStatus;
  result: AnalysisResult | null;
  error: string | null;
}
