import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
  hover?: boolean;
  glow?: boolean;
}

export function GlassCard({ children, className, padding = "p-6", hover = false, glow = false }: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        "glass-card",
        padding,
        hover && "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
        glow && "transition-all duration-200 hover:border-med-primary/40 hover:shadow-glow",
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
