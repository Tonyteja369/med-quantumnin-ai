import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useECGStore } from "@/store/useECGStore";
import { downsampleSignal } from "@/utils/signalUtils";
import { Activity } from "lucide-react";

export function SignalPreviewChart() {
  const signal = useECGStore((s) => s.uploadState.signal);
  const selectedLead = useECGStore((s) => s.selectedLead);

  const chartData = useMemo(() => {
    if (!signal) return [];
    const lead = signal.leads.find((l) => l.name === selectedLead) || signal.leads[0];
    if (!lead) return [];
    const downsampled = downsampleSignal(lead.signal, 500);
    return downsampled.map((v, i) => ({
      time: ((i / 500) * signal.duration).toFixed(2),
      value: v,
    }));
  }, [signal, selectedLead]);

  if (!signal) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-text-muted gap-2">
        <Activity className="w-8 h-8" />
        <p className="text-sm">Upload an ECG to preview</p>
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--text-muted))" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "var(--glass-bg)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--glass-border)",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Line type="monotone" dataKey="value" stroke="hsl(var(--accent-primary))" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
