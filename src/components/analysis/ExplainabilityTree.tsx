import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, ChevronRight } from "lucide-react";
import { useECGStore } from "@/store/useECGStore";
import { GlassCard } from "@/components/med/GlassCard";

export function ExplainabilityTree() {
  const diagnoses = useECGStore((s) => s.analysisState.result?.diagnoses) || [];
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-5 h-5 text-med-primary" />
        <h2 className="text-lg font-semibold">Reasoning Trace</h2>
      </div>

      <div className="space-y-2">
        {diagnoses.map((d) => {
          const isOpen = expanded === d.id;
          return (
            <div key={d.id}>
              <button
                onClick={() => setExpanded(isOpen ? null : d.id)}
                className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <ChevronRight className={`w-4 h-4 text-med-primary transition-transform ${isOpen ? "rotate-90" : ""}`} />
                <span className="text-sm font-medium">{d.condition}</span>
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-6 pl-4 border-l-2 border-med-primary/20 space-y-2 pb-2">
                      {d.reasoning.map((r) => (
                        <div key={r.step} className="p-2 rounded-lg bg-surface/50 text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-5 rounded-full bg-med-primary/10 text-med-primary flex items-center justify-center text-[10px] font-bold">{r.step}</span>
                            <span className="font-medium">{r.description}</span>
                          </div>
                          <div className="ml-7 text-text-secondary">
                            <span className="font-mono text-med-primary">{r.featureUsed}</span>: {String(r.value)} vs {r.threshold}
                          </div>
                          <div className="ml-7 mt-1 text-med-secondary font-medium">→ {r.conclusion}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
