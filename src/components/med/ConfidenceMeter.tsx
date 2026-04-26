import { AnimatedNumber } from "./AnimatedNumber";
import { getConfidenceColor } from "@/utils/colorTokens";

interface ConfidenceMeterProps {
  value: number;
  size?: number;
  label?: string;
}

export function ConfidenceMeter({ value, size = 120, label }: ConfidenceMeterProps) {
  const r = (size - 12) / 2;
  const circumference = Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  const color = getConfidenceColor(value / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
        <path
          d={`M 6 ${size / 2 + 6} A ${r} ${r} 0 0 1 ${size - 6} ${size / 2 + 6}`}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={`M 6 ${size / 2 + 6} A ${r} ${r} 0 0 1 ${size - 6} ${size / 2 + 6}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="-mt-8 text-center">
        <AnimatedNumber value={value} className="text-2xl font-bold" suffix="%" />
        {label && <p className="text-xs text-text-secondary mt-1">{label}</p>}
      </div>
    </div>
  );
}
