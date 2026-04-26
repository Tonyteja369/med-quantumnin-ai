import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Home, UploadCloud, Activity, FileText, ChevronLeft, ChevronRight, Heart, Brain } from "lucide-react";
import { useECGStore } from "@/store/useECGStore";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Records", icon: UploadCloud, path: "/upload" },
  { label: "Analysis", icon: Activity, path: "/analysis" },
  { label: "Report", icon: FileText, path: "/report" },
  { label: "Neuromuscular AI", icon: Brain, path: "/neuro-ai" },
];

export function Sidebar() {
  const collapsed = useECGStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useECGStore((s) => s.toggleSidebar);
  const location = useLocation();

  return (
    <motion.aside
      className="fixed left-0 top-0 h-full z-40 glass-card border-r border-border flex flex-col no-print"
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-border shrink-0">
        <Heart className="w-6 h-6 text-med-primary shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="font-bold text-sm whitespace-nowrap overflow-hidden"
            >
              MedQuantum
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group",
                active
                  ? "bg-med-primary/10 text-med-primary"
                  : "text-text-secondary hover:text-foreground hover:bg-muted/50"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-med-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5 shrink-0 relative z-10" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden relative z-10"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-border space-y-3">
        <ThemeToggle collapsed={collapsed} />
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-text-secondary hover:text-foreground hover:bg-muted/50 transition-all w-full"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
