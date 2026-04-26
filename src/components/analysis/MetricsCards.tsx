import { Heart, Activity, BarChart2, Zap, Clock, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/med/GlassCard";
import { AnimatedNumber } from "@/components/med/AnimatedNumber";
import { MedBadge } from "@/components/med/MedBadge";
import { useECGStore } from "@/store/useECGStore";
import type { ECGFeatures, Severity } from "@/types/ecg.types";

interface MetricDef {
  key: keyof ECGFeatures;
  label: string;
  unit: string;
  icon: typeof Heart;
  getNormal: (v: number) => Severity;
  format?: (v: number) => number;
}

const metrics: MetricDef[] = [
  { key: "heartRate", label: "Heart Rate", unit: "bpm", icon: Heart, getNormal: (v) => v >= 60 && v <= 100 ? "normal" : v > 150 || v < 40 ? "critical" : "warning" },
  { key: "rrMean", label: "RR Interval", unit: "ms", icon: Activity, getNormal: (v) => v >= 600 && v <= 1000 ? "normal" : "warning", format: Math.round },
  { key: "prInterval", label: "PR Interval", unit: "ms", icon: BarChart2, getNormal: (v) => v >= 120 && v <= 200 ? "normal" : "warning", format: Math.round },
  { key: "qrsDuration", label: "QRS Duration", unit: "ms", icon: Zap, getNormal: (v) => v < 120 ? "normal" : "warning", format: Math.round },
  { key: "qtInterval", label: "QT Interval", unit: "ms", icon: Clock, getNormal: (v) => v >= 350 && v <= 450 ? "normal" : "warning", format: Math.round },
  { key: "qtcInterval", label: "QTc (Bazett)", unit: "ms", icon: AlertTriangle, getNormal: (v) => v <= 450 ? "normal" : v > 500 ? "critical" : "warning", format: Math.round },
];

export function MetricsCards() {
  const features = useECGStore((s) => s.analysisState.result?.features);
  if (!features) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {metrics.map((m) => {
        const raw = features[m.key];
        if (raw == null) return null;
        const val = typeof raw === "number" ? raw : 0;
        const display = m.format ? m.format(val) : val;
        const severity = m.getNormal(val);

        return (
          <GlassCard key={m.key} padding="p-4" hover>
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-med-primary/10 flex items-center justify-center">
                <m.icon className="w-4 h-4 text-med-primary" />
              </div>
              <MedBadge label={severity} variant={severity} size="sm" />
            </div>
            <p className="text-xs text-text-secondary mb-1">{m.label}</p>
            <div className="flex items-baseline gap-1">
              <AnimatedNumber value={display} className="text-xl font-bold" />
              <span className="text-xs text-text-muted">{m.unit}</span>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
