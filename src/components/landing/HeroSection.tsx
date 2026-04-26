import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusDot } from "@/components/med/StatusDot";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const stats = [
  { label: "Features Extracted", value: "50+" },
  { label: "Rule Engines", value: "12" },
  { label: "Analysis Time", value: "<3s" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4">
      <motion.div variants={container} initial="hidden" animate="show" className="text-center max-w-3xl mx-auto relative z-10">
        <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-surface/50 mb-8">
          <StatusDot status="online" />
          <span className="text-xs font-medium text-text-secondary">Research-Grade ECG Analysis</span>
        </motion.div>

        <motion.h1 variants={item} className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="text-gradient-primary">MedQuantum</span>
          <span className="text-foreground">-NIN</span>
        </motion.h1>

        <motion.p variants={item} className="text-lg md:text-xl text-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
          Offline-capable ECG interpretation platform with explainable AI, real-time signal processing, and clinical-grade analysis.
        </motion.p>

        <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl medical-gradient text-background font-semibold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-glow"
          >
            Start Analysis <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl glass-card text-foreground font-semibold text-sm transition-all duration-200 hover:bg-muted/80"
          >
            ★ View on GitHub
          </a>
        </motion.div>

        <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-3">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-2 rounded-xl bg-surface/50 border border-border">
              <span className="font-mono font-bold text-med-primary text-sm">{s.value}</span>
              <span className="text-text-muted text-xs ml-2">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
