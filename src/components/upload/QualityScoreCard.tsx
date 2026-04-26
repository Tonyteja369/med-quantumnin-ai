import { useECGStore } from "@/store/useECGStore";
import { GlassCard } from "@/components/med/GlassCard";
import { AnimatedNumber } from "@/components/med/AnimatedNumber";
import { MedBadge } from "@/components/med/MedBadge";
import { Volume2, TrendingUp, AlertCircle, Activity } from "lucide-react";
import { getConfidenceColor } from "@/utils/colorTokens";

export function QualityScoreCard() {
  const quality = useECGStore((s) => s.uploadState.signal?.quality);
  const samplingRate = useECGStore((s) => s.uploadState.signal?.samplingRate);
  if (!quality) return null;

  const color = getConfidenceColor(quality.overallScore / 100);
  const borderColor = quality.overallScore > 80 ? "border-med-secondary/30" : quality.overallScore > 60 ? "border-med-warning/30" : "border-med-danger/30";

  return (
    <GlassCard className={`border ${borderColor}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Signal Quality</h3>
        <div className="flex items-center gap-2">
          <AnimatedNumber value={quality.overallScore} className="text-2xl font-bold" />
          <span className="text-xs text-text-muted">/100</span>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full mb-4 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${quality.overallScore}%`, background: color }} />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-secondary"><Volume2 className="w-4 h-4" /> Noise Level</div>
          <MedBadge label={quality.noiseLevel} variant={quality.noiseLevel === "low" ? "normal" : quality.noiseLevel === "medium" ? "warning" : "critical"} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-secondary"><TrendingUp className="w-4 h-4" /> Baseline Wander</div>
          <MedBadge label={quality.baselineWander ? "Yes" : "No"} variant={quality.baselineWander ? "warning" : "normal"} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-secondary"><AlertCircle className="w-4 h-4" /> Signal Loss</div>
          <MedBadge label={quality.signalLoss ? "Detected" : "None"} variant={quality.signalLoss ? "critical" : "normal"} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-secondary"><Activity className="w-4 h-4" /> Sampling Rate</div>
          <span className="text-sm font-mono">{samplingRate ?? "?"} Hz</span>
        </div>
      </div>
    </GlassCard>
  );
}
