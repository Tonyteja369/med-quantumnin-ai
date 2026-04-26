import type { RiskLevel } from "@/types/ecg.types";

export const formatHeartRate = (hr: number) => `${Math.round(hr)} bpm`;
export const formatInterval = (ms: number) => `${Math.round(ms)} ms`;
export const formatConfidence = (c: number) => `${(c * 100).toFixed(1)}%`;
export const formatTimestamp = (d: Date) => new Date(d).toLocaleString();
export const formatQTc = (qtc: number) => `${Math.round(qtc)} ms${qtc > 450 ? " (prolonged)" : ""}`;

export function formatRiskLevel(risk: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    "normal": "✅ Normal",
    "low-risk": "🟢 Low Risk",
    "moderate": "🟡 Moderate",
    "high-risk": "🟠 High Risk",
    "critical": "🔴 Critical",
  };
  return map[risk];
}
