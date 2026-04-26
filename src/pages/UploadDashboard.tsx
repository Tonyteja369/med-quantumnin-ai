import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { DropZone } from "@/components/upload/DropZone";
import { WFDBLoader } from "@/components/upload/WFDBLoader";
import { SignalPreviewChart } from "@/components/upload/SignalPreviewChart";
import { QualityScoreCard } from "@/components/upload/QualityScoreCard";
import { LeadSelector } from "@/components/upload/LeadSelector";
import { GlassCard } from "@/components/med/GlassCard";
import { Spinner } from "@/components/med/Spinner";
import { useECGStore } from "@/store/useECGStore";
import { useECGAnalysis } from "@/hooks/useECGAnalysis";
import { ArrowRight } from "lucide-react";

// Upload functionality intentionally disabled per spec — only the curated
// PhysioNet sample records drive the demo. Code is preserved for future use.
const SHOW_UPLOAD_UI = false;

export default function UploadDashboard() {
  const signal = useECGStore((s) => s.uploadState.signal);
  const signalId = useECGStore((s) => s.signalId);
  const isSignalReady = useECGStore((s) => s.isSignalReady);
  const { analyzeCurrentECG, isLoading } = useECGAnalysis();
  const navigate = useNavigate();
  const lastAutoAnalyzedId = useRef<string | null>(null);

  // Auto-analyze whenever a NEW record is loaded — guarantees a fresh result
  // for each PhysioNet sample (no stale analysisState across selections).
  useEffect(() => {
    if (!signalId || !isSignalReady || isLoading) return;
    if (lastAutoAnalyzedId.current === signalId) return;
    lastAutoAnalyzedId.current = signalId;
    (async () => {
      try {
        await analyzeCurrentECG();
        navigate("/analysis");
      } catch {
        /* analysis error already in store */
      }
    })();
  }, [signalId, isSignalReady, isLoading, analyzeCurrentECG, navigate]);

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Select an ECG record</h1>
        <p className="text-sm text-text-secondary mb-6">
          Choose one of the curated PhysioNet samples below. Each record produces a
          clinically distinct analysis.
        </p>
        <div className="grid grid-cols-1 gap-6">
          <WFDBLoader />

          {SHOW_UPLOAD_UI && (
            <div className="space-y-4">
              <DropZone />
              {signal && (
                <>
                  <GlassCard>
                    <LeadSelector />
                    <div className="mt-3">
                      <SignalPreviewChart key={`${signalId}-${signal.id}`} />
                    </div>
                  </GlassCard>
                  <QualityScoreCard />
                </>
              )}
            </div>
          )}
        </div>

        {SHOW_UPLOAD_UI && signal && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={async () => {
                try {
                  await analyzeCurrentECG();
                  navigate("/analysis");
                } catch {}
              }}
              disabled={isLoading || !isSignalReady || !signalId}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl medical-gradient text-background font-semibold transition-all hover:scale-[1.02] hover:shadow-glow disabled:opacity-50"
            >
              {isLoading ? (
                <><Spinner size="sm" className="text-background border-background/30" /> Analyzing...</>
              ) : (
                <>Analyze ECG <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}

        {isLoading && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-text-secondary">Analyzing ECG…</p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
