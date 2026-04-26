import { motion } from "framer-motion";
import { useECGStore } from "@/store/useECGStore";
import { cn } from "@/lib/utils";

export function LeadSelector() {
  const selectedLead = useECGStore((s) => s.selectedLead);
  const setSelectedLead = useECGStore((s) => s.setSelectedLead);
  const leads = useECGStore((s) => s.uploadState.signal?.leads ?? []);

  if (leads.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {leads.map((lead) => (
        <button
          key={lead.name}
          onClick={() => setSelectedLead(lead.name)}
          className={cn(
            "relative px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
            selectedLead === lead.name
              ? "text-background"
              : "text-text-secondary hover:text-foreground hover:bg-muted/50"
          )}
        >
          {selectedLead === lead.name && (
            <motion.div
              layoutId="lead-active"
              className="absolute inset-0 medical-gradient rounded-lg"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{lead.name}</span>
        </button>
      ))}
    </div>
  );
}
