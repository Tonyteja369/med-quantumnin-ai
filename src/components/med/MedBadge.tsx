import { cn } from "@/lib/utils";
import type { Severity } from "@/types/ecg.types";
import { getSeverityBg } from "@/utils/colorTokens";

interface MedBadgeProps {
  label: string;
  variant?: Severity | "info" | "neutral";
  size?: "sm" | "md";
  pulse?: boolean;
}

export function MedBadge({ label, variant = "neutral", size = "sm", pulse = false }: MedBadgeProps) {
  const colorMap: Record<string, string> = {
    normal: getSeverityBg("normal"),
    warning: getSeverityBg("warning"),
    critical: getSeverityBg("critical"),
    info: "bg-med-primary/10 text-med-primary border-med-primary/20",
    neutral: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-[13px]",
        colorMap[variant],
        pulse && variant === "critical" && "animate-heartbeat"
      )}
    >
      {variant === "critical" && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}
