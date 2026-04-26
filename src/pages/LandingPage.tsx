import { ECGAnimatedBackground } from "@/components/landing/ECGAnimatedBackground";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeatureHighlights } from "@/components/landing/FeatureHighlights";

export default function LandingPage() {
  return (
    <div className="relative">
      <ECGAnimatedBackground />
      <HeroSection />
      <FeatureHighlights />
      <footer className="text-center py-12 text-text-muted text-sm">
        Built with ❤️ by MedQuantum — Research-grade ECG analysis
      </footer>
    </div>
  );
}
