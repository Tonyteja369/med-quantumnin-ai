import { useMemo } from "react";
import { generateECGPath } from "@/utils/signalUtils";

// Decorative-only ECG-like trace for the landing background.
// Not used for analysis — purely visual, deterministic.
function decorativeTrace(samples: number): number[] {
  const out: number[] = [];
  const beat = 60;
  for (let i = 0; i < samples; i++) {
    const t = (i % beat) / beat;
    let v = 0;
    if (t > 0.18 && t < 0.22) v = -0.15;
    else if (t >= 0.22 && t < 0.28) v = 1.0 * Math.sin(Math.PI * ((t - 0.22) / 0.06));
    else if (t >= 0.28 && t < 0.32) v = -0.25;
    else if (t > 0.4 && t < 0.55) v = 0.25 * Math.sin(Math.PI * ((t - 0.4) / 0.15));
    else if (t > 0.05 && t < 0.13) v = 0.12 * Math.sin(Math.PI * ((t - 0.05) / 0.08));
    out.push(v);
  }
  return out;
}

export function ECGAnimatedBackground() {
  const path = useMemo(() => generateECGPath(decorativeTrace(800), 1600, 200), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--text-primary)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* ECG trace */}
      <svg className="absolute bottom-1/3 left-0 w-full h-[200px] opacity-20" viewBox="0 0 1600 200" preserveAspectRatio="none">
        <path
          d={path}
          fill="none"
          stroke="hsl(var(--accent-primary))"
          strokeWidth="2"
          strokeDasharray="1000"
          className="animate-ecg-trace"
        />
      </svg>
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-med-primary/5 blur-[120px]" />
    </div>
  );
}
