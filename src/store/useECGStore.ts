import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  UploadState, AnalysisState, ReportData,
} from "@/types/ecg.types";

interface ECGStore {
  uploadState: UploadState;
  analysisState: AnalysisState;
  selectedLead: string;
  activeTheme: "light" | "dark";
  sidebarCollapsed: boolean;
  reportData: ReportData | null;
  // RULE 6: explicit gating fields
  signalId: string | null;
  isSignalReady: boolean;
  setUploadState: (s: Partial<UploadState>) => void;
  setAnalysisState: (s: Partial<AnalysisState>) => void;
  setSelectedLead: (l: string) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setReportData: (r: ReportData | null) => void;
  setSignalReady: (id: string) => void;
  clearSignal: () => void;
  resetAll: () => void;
}

const initialUpload: UploadState = { status: "idle", progress: 0, error: null, signal: null };
const initialAnalysis: AnalysisState = { status: "idle", result: null, error: null };

export const useECGStore = create<ECGStore>()(
  persist(
    (set) => ({
      uploadState: initialUpload,
      analysisState: initialAnalysis,
      selectedLead: "MLII",
      activeTheme: "dark",
      sidebarCollapsed: false,
      reportData: null,
      signalId: null,
      isSignalReady: false,
      setUploadState: (s) => set((state) => ({ uploadState: { ...state.uploadState, ...s } })),
      setAnalysisState: (s) => set((state) => ({ analysisState: { ...state.analysisState, ...s } })),
      setSelectedLead: (l) => set({ selectedLead: l }),
      toggleTheme: () => set((state) => ({ activeTheme: state.activeTheme === "dark" ? "light" : "dark" })),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setReportData: (r) => set({ reportData: r }),
      setSignalReady: (id) => set({ signalId: id, isSignalReady: true }),
      clearSignal: () => set({ signalId: null, isSignalReady: false, uploadState: initialUpload }),
      resetAll: () =>
        set({
          uploadState: initialUpload,
          analysisState: initialAnalysis,
          reportData: null,
          signalId: null,
          isSignalReady: false,
        }),
    }),
    {
      name: "medquantum-storage",
      partialize: (state) => ({ activeTheme: state.activeTheme, sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
