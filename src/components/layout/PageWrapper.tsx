import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="min-h-[calc(100vh-3.5rem)] p-4 md:p-6 lg:p-8"
    >
      {children}
    </motion.div>
  );
}
