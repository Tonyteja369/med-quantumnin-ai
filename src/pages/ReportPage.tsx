import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { SOAPReport } from "@/components/report/SOAPReport";
import { DoctorSummary } from "@/components/report/DoctorSummary";
import { PatientExplanation } from "@/components/report/PatientExplanation";
import { PDFExportButton } from "@/components/report/PDFExportButton";
import { ConfidenceMeter } from "@/components/med/ConfidenceMeter";
import { GlassCard } from "@/components/med/GlassCard";
import { MedBadge } from "@/components/med/MedBadge";
import { useECGStore } from "@/store/useECGStore";
import { formatTimestamp } from "@/utils/formatters";
import { Printer } from "lucide-react";

export default function ReportPage() {
  const report = useECGStore((s) => s.reportData);
  const navigate = useNavigate();

  useEffect(() => {
    if (!report) navigate("/upload");
  }, [report, navigate]);

  if (!report) return null;

  const avgConf = report.analysisResult.diagnoses.reduce((s, d) => s + d.confidence, 0) / report.analysisResult.diagnoses.length * 100;

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Clinical Report</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main content */}
          <div className="lg:col-span-3 space-y-6" id="report-content">
            <SOAPReport />
            <DoctorSummary />
            <PatientExplanation />
          </div>

          {/* Sidebar */}
          <div className="space-y-4 no-print">
            <GlassCard className="flex flex-col items-center">
              <ConfidenceMeter value={Math.round(avgConf)} size={120} label="Confidence" />
            </GlassCard>

            <GlassCard padding="p-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-text-secondary">Record</span><span className="font-mono">{report.analysisResult.ecgId.slice(0, 8)}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Date</span><span className="font-mono">{formatTimestamp(report.analysisResult.timestamp)}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Model</span><MedBadge label={report.analysisResult.modelVersion} variant="info" size="sm" /></div>
              </div>
            </GlassCard>

            <PDFExportButton />

            <button
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Report
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
