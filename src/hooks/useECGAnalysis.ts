import { useState, useCallback } from "react";
import { useECGStore } from "@/store/useECGStore";
import { simulateAnalysis } from "@/api/ecgApi";

export function useECGAnalysis() {
  const uploadState = useECGStore((s) => s.uploadState);
  const setAnalysisState = useECGStore((s) => s.setAnalysisState);
  const setReportData = useECGStore((s) => s.setReportData);
  const [isLoading, setIsLoading] = useState(false);

  const analyzeCurrentECG = useCallback(async () => {
    if (!uploadState.signal) return;
    setIsLoading(true);
    setAnalysisState({ status: "analyzing", error: null });

    try {
      const { result, report } = await simulateAnalysis(uploadState.signal);
      setAnalysisState({ status: "complete", result });
      setReportData(report);
      setIsLoading(false);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setAnalysisState({ status: "error", error: msg });
      setIsLoading(false);
      throw e;
    }
  }, [uploadState.signal, setAnalysisState, setReportData]);

  return { analyzeCurrentECG, isLoading };
}
