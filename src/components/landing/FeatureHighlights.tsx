import { motion } from "framer-motion";
import { Zap, BarChart2, Shield, Brain, WifiOff, FileText } from "lucide-react";
import { GlassCard } from "@/components/med/GlassCard";

const features = [
  { icon: Zap, title: "Signal Processing", desc: "Notch filter, baseline correction, bandpass filtering & smoothing" },
  { icon: BarChart2, title: "Feature Extraction", desc: "HR, RR, PR, QRS, QT, QTc intervals & HRV metrics" },
  { icon: Shield, title: "Clinical Rules", desc: "Tachycardia, bradycardia, AFib, QT prolongation detection" },
  { icon: Brain, title: "Explainable AI", desc: "Reasoning traces, confidence scores, feature importance" },
  { icon: WifiOff, title: "Offline First", desc: "CPU-only processing, no cloud dependency, instant results" },
  { icon: FileText, title: "Report Generation", desc: "SOAP notes, PDF export, patient-friendly summaries" },
];

export function FeatureHighlights() {
  return (
    <section className="py-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold mb-3">Clinical-Grade Features</h2>
        <p className="text-text-secondary max-w-lg mx-auto">Everything you need for comprehensive ECG interpretation.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <GlassCard hover glow className="h-full">
              <div className="w-10 h-10 rounded-xl bg-med-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-med-primary" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
