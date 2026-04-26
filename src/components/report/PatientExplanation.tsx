import { useECGStore } from "@/store/useECGStore";
import { GlassCard } from "@/components/med/GlassCard";
import { Heart } from "lucide-react";

export function PatientExplanation() {
  const report = useECGStore((s) => s.reportData);
  if (!report) return null;

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-med-secondary" />
        <h2 className="text-lg font-semibold">Your Heart Health Summary</h2>
      </div>
      <div className="text-[15px] leading-[1.8] text-text-secondary space-y-4">
        <div>
          <h3 className="font-semibold text-foreground mb-1">What we measured</h3>
          <p>We recorded the electrical activity of your heart using an ECG. This helps us understand how your heart beats, its rhythm, and its timing.</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-1">What we found</h3>
          <p>{report.patientSummary}</p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-1">What this means for you</h3>
          <p>
            {report.analysisResult.overallRisk === "normal"
              ? "Your heart appears to be beating normally. This is good news! Continue your regular health routine."
              : "Some findings were noted that your healthcare provider will discuss with you. This doesn't necessarily mean something is wrong — many findings are minor."}
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-1">Next steps</h3>
          <p>
            {report.analysisResult.overallRisk === "normal"
              ? "No immediate action needed. Continue with routine check-ups as recommended by your doctor."
              : "Please schedule a follow-up appointment with your healthcare provider to discuss these results in detail."}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
