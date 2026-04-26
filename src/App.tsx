import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useECGStore } from "@/store/useECGStore";
import { useTheme } from "@/hooks/useTheme";
import LandingPage from "@/pages/LandingPage";
import UploadDashboard from "@/pages/UploadDashboard";
import AnalysisDashboard from "@/pages/AnalysisDashboard";
import ReportPage from "@/pages/ReportPage";
import NeuromuscularAI from "@/pages/NeuromuscularAI";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppLayout() {
  const location = useLocation();
  const collapsed = useECGStore((s) => s.sidebarCollapsed);
  const isLanding = location.pathname === "/";
  useTheme();

  if (isLanding) {
    return (
      <div className="min-h-screen">
        <AnimatePresence mode="wait">
          <LandingPage key="landing" />
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col transition-all duration-200" style={{ marginLeft: collapsed ? 64 : 220 }}>
        <TopBar />
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/upload" element={<UploadDashboard />} />
              <Route path="/analysis" element={<AnalysisDashboard />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/neuro-ai" element={<NeuromuscularAI />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />} />
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
