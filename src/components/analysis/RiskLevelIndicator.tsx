import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { useECGStore } from "@/store/useECGStore";
import { GlassCard } from "@/components/med/GlassCard";
import { formatRiskLevel } from "@/utils/formatters";
import { getRiskBgClass } from "@/utils/colorTokens";
import type { RiskLevel } from "@/types/ecg.types";

const riskSteps: RiskLevel[] = ["normal", "low-risk", "moderate", "high-risk", "critical"];

export function RiskLevelIndicator() {
  const risk = useECGStore((s) => s.analysisState.result?.overallRisk) || "normal";
  const stepIdx = riskSteps.indexOf(risk);
  const Icon = stepIdx <= 1 ? ShieldCheck : stepIdx <= 2 ? ShieldAlert : AlertTriangle;

  return (
    <GlassCard className={`border ${getRiskBgClass(risk)}`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-6 h-6" />
        <div>
          <h3 className="text-lg font-bold">{formatRiskLevel(risk)}</h3>
          <p className="text-xs text-text-secondary">Overall Risk Assessment</p>
        </div>
      </div>
      <div className="flex gap-1">
        {riskSteps.map((s, i) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full transition-all ${
              i <= stepIdx
                ? i <= 1 ? "bg-med-secondary" : i === 2 ? "bg-med-warning" : "bg-med-danger"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
    </GlassCard>
  );
}
