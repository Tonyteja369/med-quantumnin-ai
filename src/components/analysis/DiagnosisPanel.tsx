import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, ChevronDown, CheckCircle, AlertTriangle, Activity } from "lucide-react";
import { useECGStore } from "@/store/useECGStore";
import { GlassCard } from "@/components/med/GlassCard";
import { MedBadge } from "@/components/med/MedBadge";

function severityColor(sev: string) {
  if (sev === "critical") return { bar: "bg-med-danger", text: "text-med-danger", border: "border-l-med-danger", glow: "hsl(0 84% 60%)" };
  if (sev === "warning") return { bar: "bg-med-warning", text: "text-med-warning", border: "border-l-med-warning", glow: "hsl(38 92% 55%)" };
  return { bar: "bg-med-secondary", text: "text-med-secondary", border: "border-l-med-secondary", glow: "hsl(153 70% 45%)" };
}

export function DiagnosisPanel() {
  const diagnoses = useECGStore((s) => s.analysisState.result?.diagnoses) || [];
  const [expanded, setExpanded] = useState<string | null>(null);

  if (diagnoses.length === 0) return null;

  // All findings, ranked by confidence — show every probable diagnosis (not just the top one)
  const ranked = [...diagnoses].sort((a, b) => b.confidence - a.confidence);
  const top = ranked[0];
  const allNormal = ranked.every((d) => d.severity === "normal");

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-med-primary" />
          <h2 className="text-lg font-semibold">Probable Diagnoses</h2>
        </div>
        <span className="text-xs font-mono text-text-muted">
          {ranked.length} finding{ranked.length === 1 ? "" : "s"} detected
        </span>
      </div>

      {/* Headline ranked summary — every probable label with % */}
      <div className="mb-4 p-3 rounded-xl border border-border/60 bg-surface/40">
        <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted mb-2">
          Differential probability ranking
        </p>
        <div className="flex flex-wrap gap-2">
          {ranked.map((d, i) => {
            const c = severityColor(d.severity);
            return (
              <span
                key={d.id}
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium border ${c.border} bg-card/60`}
                style={{ borderLeftWidth: 3 }}
              >
                <span className="font-mono text-text-muted">#{i + 1}</span>
                <span>{d.condition}</span>
                <span className={`font-mono font-bold ${c.text}`}>
                  {(d.confidence * 100).toFixed(0)}%
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {allNormal && (
        <div className="flex items-center gap-3 py-2 mb-2 text-med-secondary">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">No significant abnormalities detected</span>
        </div>
      )}

      {/* Detailed breakdown per diagnosis */}
      <div className="space-y-2">
        {ranked.map((d, i) => {
          const isOpen = expanded === d.id;
          const c = severityColor(d.severity);
          const Icon = d.severity === "critical" ? AlertTriangle : d.severity === "warning" ? Activity : CheckCircle;

          return (
            <div
              key={d.id}
              className={`border-l-4 ${c.border} rounded-lg bg-surface/50 overflow-hidden`}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : d.id)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-surface/80 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-text-muted">#{i + 1}</span>
                    <Icon className={`w-3.5 h-3.5 ${c.text}`} />
                    <span className="font-semibold text-sm truncate">{d.condition}</span>
                    <MedBadge
                      label={d.severity}
                      variant={d.severity as "normal" | "warning" | "critical"}
                      size="sm"
                      pulse={d.severity === "critical" && d.id === top.id}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-48">
                      <motion.div
                        className={`h-full rounded-full ${c.bar}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${d.confidence * 100}%` }}
                        transition={{ duration: 0.7 }}
                      />
                    </div>
                    <span className={`text-xs font-mono font-bold ${c.text} min-w-[3rem] text-right`}>
                      {(d.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ml-2 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      <p className="text-xs font-semibold text-text-secondary">Supporting features:</p>
                      <ul className="text-xs text-text-secondary space-y-1">
                        {d.supportingFeatures.map((f, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className={`w-1 h-1 rounded-full ${c.bar}`} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-text-muted italic">
        Ranked by probabilistic confidence from real signal evidence. Multiple concurrent findings are shown — not collapsed into a single case.
      </p>
    </GlassCard>
  );
}
