import { useLocation } from "react-router-dom";
import { Activity } from "lucide-react";
import { StatusDot } from "@/components/med/StatusDot";
import { generateECGPath } from "@/utils/signalUtils";
import { useMemo } from "react";

// Decorative mini-trace for the top bar (not analysis data).
function decorativeMini(samples: number): number[] {
  const out: number[] = [];
  const beat = 40;
  for (let i = 0; i < samples; i++) {
    const t = (i % beat) / beat;
    let v = 0;
    if (t >= 0.22 && t < 0.28) v = Math.sin(Math.PI * ((t - 0.22) / 0.06));
    else if (t > 0.4 && t < 0.55) v = 0.25 * Math.sin(Math.PI * ((t - 0.4) / 0.15));
    out.push(v);
  }
  return out;
}

const routeNames: Record<string, string> = {
  "/": "Home",
  "/upload": "Upload Dashboard",
  "/analysis": "ECG Analysis",
  "/report": "Clinical Report",
};

export function TopBar() {
  const location = useLocation();
  const pageName = routeNames[location.pathname] || "Page";

  const miniEcg = useMemo(() => generateECGPath(decorativeMini(200), 120, 32), []);

  return (
    <header className="h-14 glass-card border-b border-border flex items-center justify-between px-6 no-print sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-text-muted" />
        <span className="text-sm text-text-secondary">/</span>
        <span className="text-sm font-medium">{pageName}</span>
      </div>

      <div className="hidden sm:block">
        <svg width="120" height="32" className="opacity-30">
          <path
            d={miniEcg}
            fill="none"
            stroke="hsl(var(--accent-primary))"
            strokeWidth="1.5"
            strokeDasharray="1000"
            className="animate-ecg-trace"
          />
        </svg>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <StatusDot status="online" />
          <span className="hidden sm:inline">System Ready</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-med-primary/20 flex items-center justify-center text-xs font-bold text-med-primary">
          MQ
        </div>
      </div>
    </header>
  );
}
