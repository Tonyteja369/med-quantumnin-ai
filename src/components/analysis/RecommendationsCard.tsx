import { Clipboard, Pill, Calendar, Activity, AlertTriangle } from "lucide-react";
import { useECGStore } from "@/store/useECGStore";
import { GlassCard } from "@/components/med/GlassCard";

const iconMap: Record<string, typeof Pill> = {
  medication: Pill,
  "follow-up": Calendar,
  lifestyle: Activity,
  urgent: AlertTriangle,
};

function getRecommendationType(text: string): string {
  if (text.toLowerCase().includes("medication") || text.toLowerCase().includes("beta") || text.toLowerCase().includes("drug")) return "medication";
  if (text.toLowerCase().includes("follow") || text.toLowerCase().includes("monitor")) return "follow-up";
  if (text.toLowerCase().includes("urgent") || text.toLowerCase().includes("immediate")) return "urgent";
  return "lifestyle";
}

export function RecommendationsCard() {
  const diagnoses = useECGStore((s) => s.analysisState.result?.diagnoses) || [];
  const allRecs = diagnoses.flatMap((d) => d.recommendations);
  const unique = [...new Set(allRecs)];

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Clipboard className="w-5 h-5 text-med-primary" />
        <h2 className="text-lg font-semibold">Clinical Recommendations</h2>
      </div>
      <div className="space-y-2">
        {unique.map((rec, i) => {
          const type = getRecommendationType(rec);
          const Icon = iconMap[type] || Activity;
          const isUrgent = type === "urgent";

          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${isUrgent ? "bg-med-danger/5 border border-med-danger/20" : "bg-surface/50"}`}>
              <div className="w-6 h-6 rounded-full medical-gradient flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-background">{i + 1}</span>
              </div>
              <div className="flex items-start gap-2 flex-1">
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isUrgent ? "text-med-danger" : "text-text-muted"}`} />
                <p className="text-sm text-text-secondary">{rec}</p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
