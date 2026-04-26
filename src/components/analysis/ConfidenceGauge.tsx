import { useECGStore } from "@/store/useECGStore";
import { GlassCard } from "@/components/med/GlassCard";
import { ConfidenceMeter } from "@/components/med/ConfidenceMeter";
import { MedBadge } from "@/components/med/MedBadge";
import { formatTimestamp } from "@/utils/formatters";

export function ConfidenceGauge() {
  const result = useECGStore((s) => s.analysisState.result);
  if (!result) return null;

  const avgConfidence = result.diagnoses.reduce((s, d) => s + d.confidence, 0) / result.diagnoses.length * 100;

  return (
    <GlassCard className="flex flex-col items-center">
      <ConfidenceMeter value={Math.round(avgConfidence)} size={160} label="Analysis Confidence" />
      <div className="mt-4 space-y-2 w-full">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Model Version</span>
          <MedBadge label={result.modelVersion} variant="info" size="sm" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Processed</span>
          <span className="font-mono text-text-muted">{formatTimestamp(result.timestamp)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">Duration</span>
          <span className="font-mono text-text-muted">{result.processingTime.toFixed(2)}s</span>
        </div>
      </div>
    </GlassCard>
  );
}
