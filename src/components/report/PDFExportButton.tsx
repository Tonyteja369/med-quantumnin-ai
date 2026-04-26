import { useState } from "react";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import { useECGStore } from "@/store/useECGStore";
import { Spinner } from "@/components/med/Spinner";

const PAGE_W = 210; // A4 portrait
const PAGE_H = 297;
const MARGIN = 15;

export function PDFExportButton() {
  const [loading, setLoading] = useState(false);
  const result = useECGStore((s) => s.analysisState.result);
  const signal = useECGStore((s) => s.uploadState.signal);
  const report = useECGStore((s) => s.reportData);

  const handleExport = async () => {
    if (!result || !signal) return;
    setLoading(true);
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      let y = MARGIN;

      // ---------- Header ----------
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, PAGE_W, 24, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("MedQuantum NIN", MARGIN, 11);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text("ECG Analysis Report", MARGIN, 18);
      pdf.setFontSize(9);
      pdf.text(
        new Date().toLocaleString(),
        PAGE_W - MARGIN,
        18,
        { align: "right" }
      );
      y = 32;
      pdf.setTextColor(20, 20, 20);

      // ---------- Patient / record info ----------
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("Record Information", MARGIN, y);
      y += 5;
      pdf.setDrawColor(220);
      pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const info: Array<[string, string]> = [
        ["Demo ID", "MQ-NIN-DEMO"],
        ["Record", signal.filename],
        ["Sampling rate", `${signal.samplingRate} Hz`],
        ["Duration", `${signal.duration.toFixed(1)} s`],
        ["Source", "PhysioNet curated"],
        ["Timestamp", result.timestamp.toLocaleString()],
      ];
      for (const [k, v] of info) {
        pdf.setTextColor(110, 110, 110);
        pdf.text(`${k}:`, MARGIN, y);
        pdf.setTextColor(20, 20, 20);
        pdf.text(v, MARGIN + 38, y);
        y += 5;
      }
      y += 3;

      // ---------- ECG Summary Table ----------
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("ECG Summary", MARGIN, y);
      y += 5;
      pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 6;

      const f = result.features;
      const cv = f.rrMean > 0 ? f.rrStd / f.rrMean : 0;
      const summaryRows: Array<[string, string, string]> = [
        ["Heart Rate", `${f.heartRate}`, "bpm"],
        ["PR Interval", f.prInterval != null ? `${f.prInterval.toFixed(0)}` : "N/A", "ms"],
        ["QRS Duration", f.qrsDuration != null ? `${f.qrsDuration.toFixed(0)}` : "N/A", "ms"],
        ["QT Interval", f.qtInterval != null ? `${f.qtInterval.toFixed(0)}` : "N/A", "ms"],
        ["QTc (Bazett)", f.qtcInterval != null ? `${f.qtcInterval.toFixed(0)}` : "N/A", "ms"],
        ["RR Mean", `${f.rrMean.toFixed(0)}`, "ms"],
        ["RR Variability (CV)", cv.toFixed(3), ""],
        ["P-wave Fraction", `${(f.pWaveFraction * 100).toFixed(0)}`, "%"],
        ["PVC Count", `${f.pvcCount}`, "beats"],
        ["RMSSD", f.rmssd.toFixed(1), "ms"],
      ];

      pdf.setFontSize(9);
      // Header row
      pdf.setFillColor(245, 245, 250);
      pdf.rect(MARGIN, y - 4, PAGE_W - 2 * MARGIN, 6, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Parameter", MARGIN + 2, y);
      pdf.text("Value", MARGIN + 90, y);
      pdf.text("Unit", MARGIN + 130, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(20, 20, 20);
      for (const [param, val, unit] of summaryRows) {
        if (y > PAGE_H - 20) {
          pdf.addPage();
          y = MARGIN;
        }
        pdf.text(param, MARGIN + 2, y);
        pdf.text(val, MARGIN + 90, y);
        pdf.text(unit, MARGIN + 130, y);
        pdf.setDrawColor(235);
        pdf.line(MARGIN, y + 1.5, PAGE_W - MARGIN, y + 1.5);
        y += 5.5;
      }
      y += 4;

      // ---------- Diagnosis ----------
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Diagnosis", MARGIN, y);
      y += 5;
      pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 6;
      pdf.setFontSize(10);

      const primary = result.diagnoses[0];
      if (primary) {
        const sevColor: [number, number, number] =
          primary.severity === "critical"
            ? [239, 68, 68]
            : primary.severity === "warning"
            ? [245, 158, 11]
            : [16, 185, 129];
        pdf.setFillColor(...sevColor);
        pdf.rect(MARGIN, y - 4, 3, 6, "F");
        pdf.setFont("helvetica", "bold");
        pdf.text(`Primary: ${primary.condition}`, MARGIN + 5, y);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(110, 110, 110);
        pdf.text(`Confidence: ${(primary.confidence * 100).toFixed(1)}% · Severity: ${primary.severity}`, MARGIN + 5, y + 5);
        pdf.setTextColor(20, 20, 20);
        y += 12;
      }

      const secondary = result.diagnoses.slice(1);
      if (secondary.length > 0) {
        pdf.setFont("helvetica", "bold");
        pdf.text("Secondary findings:", MARGIN, y);
        y += 5;
        pdf.setFont("helvetica", "normal");
        for (const d of secondary) {
          if (y > PAGE_H - 20) { pdf.addPage(); y = MARGIN; }
          pdf.text(`• ${d.condition} (${(d.confidence * 100).toFixed(0)}%)`, MARGIN + 4, y);
          y += 5;
        }
        y += 2;
      }

      // ---------- Clinical Interpretation ----------
      if (y > PAGE_H - 40) { pdf.addPage(); y = MARGIN; }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Clinical Interpretation", MARGIN, y);
      y += 5;
      pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 6;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      const interpretation = report?.clinicianSummary
        ?? `Heart rate ${f.heartRate} bpm with RR coefficient of variation ${cv.toFixed(3)}. ` +
        `P waves were detected before ${(f.pWaveFraction * 100).toFixed(0)}% of beats. ` +
        `Median QRS duration ${f.qrsDuration?.toFixed(0) ?? "N/A"} ms, QTc ${f.qtcInterval?.toFixed(0) ?? "N/A"} ms. ` +
        `${f.pvcCount} wide-QRS beats identified. Overall risk: ${result.overallRisk}.`;
      const wrapped = pdf.splitTextToSize(interpretation, PAGE_W - 2 * MARGIN);
      pdf.text(wrapped, MARGIN, y);
      y += wrapped.length * 5 + 4;

      // Reasoning steps from primary diagnosis
      if (primary?.reasoning?.length) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text("Reasoning trace:", MARGIN, y);
        y += 5;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        for (const step of primary.reasoning) {
          if (y > PAGE_H - 20) { pdf.addPage(); y = MARGIN; }
          const sentence = step.sentence ?? `${step.description}: ${step.value} (${step.threshold})`;
          const lines = pdf.splitTextToSize(`${step.step}. ${sentence}`, PAGE_W - 2 * MARGIN - 4);
          pdf.text(lines, MARGIN + 2, y);
          y += lines.length * 4 + 1;
        }
        y += 3;
      }

      // ---------- Recommendations ----------
      if (y > PAGE_H - 40) { pdf.addPage(); y = MARGIN; }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Recommendations", MARGIN, y);
      y += 5;
      pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 6;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      const allRecs = Array.from(new Set(result.diagnoses.flatMap((d) => d.recommendations)));
      for (const rec of allRecs) {
        if (y > PAGE_H - 20) { pdf.addPage(); y = MARGIN; }
        const lines = pdf.splitTextToSize(`• ${rec}`, PAGE_W - 2 * MARGIN);
        pdf.text(lines, MARGIN, y);
        y += lines.length * 5 + 1;
      }

      // ---------- Footer on every page ----------
      const pageCount = pdf.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        pdf.setPage(p);
        pdf.setDrawColor(220);
        pdf.line(MARGIN, PAGE_H - 12, PAGE_W - MARGIN, PAGE_H - 12);
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        pdf.text("AI-assisted analysis — not a medical diagnosis. Confirm with a clinician.", MARGIN, PAGE_H - 7);
        pdf.text(`Page ${p} / ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 7, { align: "right" });
      }

      const safeName = signal.filename.replace(/[^a-z0-9]+/gi, "-");
      pdf.save(`MedQuantum-NIN-${safeName}.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading || !result}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl medical-gradient text-background font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-glow disabled:opacity-50"
    >
      {loading ? <><Spinner size="sm" className="text-background border-background/30" /> Generating PDF...</> : <><Download className="w-4 h-4" /> Download PDF</>}
    </button>
  );
}
