import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ECGWaveformPanel } from "@/components/analysis/ECGWaveformPanel";
import { MetricsCards } from "@/components/analysis/MetricsCards";
import { DiagnosisPanel } from "@/components/analysis/DiagnosisPanel";
import { ConfidenceGauge } from "@/components/analysis/ConfidenceGauge";
import { ExplainabilityTree } from "@/components/analysis/ExplainabilityTree";
import { RiskLevelIndicator } from "@/components/analysis/RiskLevelIndicator";
import { RecommendationsCard } from "@/components/analysis/RecommendationsCard";
import { RRIntervalChart } from "@/components/analysis/RRIntervalChart";
import { MedBadge } from "@/components/med/MedBadge";
import { useECGStore } from "@/store/useECGStore";
import { formatRiskLevel } from "@/utils/formatters";
import { FileText, ShieldCheck } from "lucide-react";
import type { RiskLevel } from "@/types/ecg.types";

function riskAccent(risk: RiskLevel): { color: string; bg: string; label: string } {
  switch (risk) {
    case "normal":
    case "low-risk":
      return { color: "hsl(153 70% 45%)", bg: "hsl(153 70% 45% / 0.08)", label: "NORMAL" };
    case "moderate":
      return { color: "hsl(38 92% 55%)", bg: "hsl(38 92% 55% / 0.10)", label: "WARNING" };
    case "high-risk":
    case "critical":
      return { color: "hsl(0 84% 60%)", bg: "hsl(0 84% 60% / 0.10)", label: "CRITICAL" };
  }
}

export default function AnalysisDashboard() {
  const result = useECGStore((s) => s.analysisState.result);
  const signal = useECGStore((s) => s.uploadState.signal);
  const navigate = useNavigate();

  useEffect(() => {
    if (!result) navigate("/upload");
  }, [result, navigate]);

  if (!result) return null;

  const accent = riskAccent(result.overallRisk);

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto">
        {/* Severity-tinted header strip */}
        <div
          className="mb-5 flex items-center justify-between gap-4 px-4 py-3 rounded-2xl border"
          style={{
            background: accent.bg,
            borderColor: `${accent.color.replace(")", " / 0.4)")}`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-10 rounded-full"
              style={{ background: accent.color }}
            />
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider" style={{ color: accent.color }}>
                {accent.label} · {result.diagnoses.length} probable finding{result.diagnoses.length === 1 ? "" : "s"}
              </p>
              <h1 className="text-xl font-bold leading-tight">ECG Analysis Results</h1>
            </div>
          </div>
          <MedBadge
            label={formatRiskLevel(result.overallRisk)}
            variant={result.overallRisk === "normal" ? "normal" : result.overallRisk === "moderate" ? "warning" : "critical"}
            size="md"
          />
        </div>

        {/* Trust strip */}
        <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-card/40 font-mono">
            Record <span className="font-bold text-text-primary">{signal?.filename ?? "—"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-card/40 font-mono">
            {signal?.samplingRate ?? "—"} Hz · {signal?.duration.toFixed(1) ?? "—"} s
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono"
            style={{
              background: "hsl(153 70% 45% / 0.10)",
              color: "hsl(153 70% 45%)",
              border: "1px solid hsl(153 70% 45% / 0.3)",
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Real PhysioNet Data
          </span>
        </div>

        <ECGWaveformPanel />

        <div className="mt-6">
          <RRIntervalChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <MetricsCards />
            <DiagnosisPanel />
          </div>
          <div className="space-y-6">
            <ConfidenceGauge />
            <RiskLevelIndicator />
            <ExplainabilityTree />
            <RecommendationsCard />
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl medical-gradient text-background font-semibold transition-all hover:scale-[1.02] hover:shadow-glow"
          >
            <FileText className="w-4 h-4" /> Generate Report
          </Link>
        </div>
      </div>
    </PageWrapper>
  );
}
