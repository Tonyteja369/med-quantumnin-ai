import { cn } from "@/lib/utils";

type StatusDotStatus = "online" | "offline" | "processing" | "error";

interface StatusDotProps {
  status: StatusDotStatus;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  const colors: Record<StatusDotStatus, string> = {
    online: "bg-med-secondary",
    processing: "bg-med-primary animate-pulse",
    offline: "bg-text-muted",
    error: "bg-med-danger animate-heartbeat",
  };

  return (
    <span className={cn("relative flex h-2.5 w-2.5", className)}>
      {(status === "online" || status === "error") && (
        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-40 animate-ping", colors[status])} />
      )}
      <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", colors[status])} />
    </span>
  );
}
