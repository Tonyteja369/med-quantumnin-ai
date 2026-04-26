import { useMemo } from "react";
import { useECGStore } from "@/store/useECGStore";
import { GlassCard } from "@/components/med/GlassCard";
import { Activity } from "lucide-react";

interface BarStat {
  rr: number;
  color: string;
  height: number;
}

export function RRIntervalChart() {
  const features = useECGStore((s) => s.analysisState.result?.features);

  const stats = useMemo(() => {
    if (!features || features.rrIntervals.length < 2) return null;
    const rrs = features.rrIntervals;
    const m = rrs.reduce((a, b) => a + b, 0) / rrs.length;
    const variance = rrs.reduce((a, b) => a + (b - m) ** 2, 0) / rrs.length;
    const std = Math.sqrt(variance);
    const cv = m > 0 ? std / m : 0;
    const longest = Math.max(...rrs);
    const shortest = Math.min(...rrs);

    const maxBar = Math.max(longest, m + 3 * std);
    const bars: BarStat[] = rrs.map((rr) => {
      const dev = Math.abs(rr - m) / (m || 1);
      const color =
        dev <= 0.1
          ? "hsl(142 76% 56%)" // green
          : dev <= 0.25
            ? "hsl(38 92% 60%)" // amber
            : "hsl(0 84% 60%)"; // red
      return { rr, color, height: Math.max(4, (rr / maxBar) * 100) };
    });

    let interp = "";
    if (cv < 0.1) interp = "Regular rhythm — RR intervals consistent.";
    else if (cv < 0.2) interp = "Mildly irregular rhythm — monitor.";
    else interp = "Highly irregular rhythm — suggests atrial fibrillation.";

    return { bars, m, std, cv, longest, shortest, interp };
  }, [features]);

  if (!stats) {
    return (
      <GlassCard>
        <p className="text-sm text-text-muted">Insufficient beats for RR analysis.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-5 h-5 text-med-primary" />
        <h2 className="text-lg font-semibold">RR Intervals</h2>
      </div>
      <p className="text-xs text-text-muted mb-4">Beat-by-beat timing in ms</p>

      <div className="flex items-end gap-[2px] h-24 mb-3 px-1 overflow-x-auto">
        {stats.bars.map((b, i) => (
          <div
            key={i}
            title={`Beat ${i + 1}: ${b.rr.toFixed(0)} ms`}
            style={{
              background: b.color,
              height: `${b.height}%`,
              minWidth: "4px",
              flex: "1 1 4px",
              borderRadius: "1px",
              opacity: 0.85,
            }}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs mb-3">
        <Stat label="Mean RR" value={`${stats.m.toFixed(0)} ms`} />
        <Stat label="Std Dev" value={`${stats.std.toFixed(0)} ms`} />
        <Stat label="CV" value={stats.cv.toFixed(3)} />
        <Stat label="Longest" value={`${stats.longest.toFixed(0)} ms`} />
        <Stat label="Shortest" value={`${stats.shortest.toFixed(0)} ms`} />
      </div>

      <p className="text-xs text-text-secondary border-t border-border/50 pt-3">
        {stats.interp}
      </p>
    </GlassCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2 bg-surface/40">
      <p className="text-[10px] uppercase tracking-wider text-text-muted font-mono">{label}</p>
      <p className="text-sm font-mono font-semibold text-text-primary">{value}</p>
    </div>
  );
}
