import type { Severity, RiskLevel } from "@/types/ecg.types";

export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case "normal": return "text-med-secondary";
    case "warning": return "text-med-warning";
    case "critical": return "text-med-danger";
  }
}

export function getSeverityBg(severity: Severity): string {
  switch (severity) {
    case "normal": return "bg-med-secondary/10 text-med-secondary border-med-secondary/20";
    case "warning": return "bg-med-warning/10 text-med-warning border-med-warning/20";
    case "critical": return "bg-med-danger/10 text-med-danger border-med-danger/20";
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "#00FF94";
  if (confidence >= 0.5) return "#FFB800";
  return "#FF4757";
}

export function getRiskColor(risk: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    "normal": "hsl(var(--accent-secondary))",
    "low-risk": "hsl(var(--accent-primary))",
    "moderate": "hsl(var(--accent-warning))",
    "high-risk": "hsl(var(--accent-danger))",
    "critical": "hsl(var(--accent-danger))",
  };
  return map[risk];
}

export function getRiskBgClass(risk: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    "normal": "bg-med-secondary/10 border-med-secondary/30",
    "low-risk": "bg-med-primary/10 border-med-primary/30",
    "moderate": "bg-med-warning/10 border-med-warning/30",
    "high-risk": "bg-med-danger/10 border-med-danger/30",
    "critical": "bg-med-danger/20 border-med-danger/50",
  };
  return map[risk];
}
