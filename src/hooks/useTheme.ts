import { useEffect } from "react";
import { useECGStore } from "@/store/useECGStore";

export function useTheme() {
  const activeTheme = useECGStore((s) => s.activeTheme);
  const toggleTheme = useECGStore((s) => s.toggleTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme);
    if (activeTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [activeTheme]);

  return { theme: activeTheme, toggleTheme };
}
