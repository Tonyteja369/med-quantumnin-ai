import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, BarChart2, Brain, ClipboardList, ChevronDown } from "lucide-react";
import { useECGStore } from "@/store/useECGStore";
import { GlassCard } from "@/components/med/GlassCard";

const sections = [
  { key: "subjective" as const, label: "Subjective", icon: User, color: "border-l-med-primary" },
  { key: "objective" as const, label: "Objective", icon: BarChart2, color: "border-l-med-secondary" },
  { key: "assessment" as const, label: "Assessment", icon: Brain, color: "border-l-med-warning" },
  { key: "plan" as const, label: "Plan", icon: ClipboardList, color: "border-l-med-info" },
];

export function SOAPReport() {
  const soapNote = useECGStore((s) => s.reportData?.soapNote);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["subjective", "objective", "assessment", "plan"]));

  if (!soapNote) return null;

  const toggle = (key: string) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key); else next.add(key);
    setExpanded(next);
  };

  return (
    <GlassCard>
      <h2 className="text-lg font-semibold mb-4">SOAP Note</h2>
      <div className="space-y-3">
        {sections.map((s) => (
          <div key={s.key} className={`border-l-4 ${s.color} rounded-lg overflow-hidden`}>
            <button onClick={() => toggle(s.key)} className="flex items-center justify-between w-full p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <s.icon className="w-4 h-4 text-text-muted" />
                <span className="font-medium text-sm">{s.label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${expanded.has(s.key) ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {expanded.has(s.key) && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <p className="px-3 pb-3 text-sm text-text-secondary leading-relaxed">{soapNote[s.key]}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
