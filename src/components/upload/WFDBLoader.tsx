import { useState } from "react";
import { Database } from "lucide-react";
import { WFDB_SAMPLES, loadWFDBSample } from "@/api/ecgApi";
import { useECGStore } from "@/store/useECGStore";
import { GlassCard } from "@/components/med/GlassCard";
import { MedBadge } from "@/components/med/MedBadge";
import { Spinner } from "@/components/med/Spinner";
import type { Severity } from "@/types/ecg.types";

export function WFDBLoader() {
  const setUploadState = useECGStore((s) => s.setUploadState);
  const setSignalReady = useECGStore((s) => s.setSignalReady);
  const setSelectedLead = useECGStore((s) => s.setSelectedLead);
  const clearSignal = useECGStore((s) => s.clearSignal);
  const [loading, setLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleLoad = async (recordName: string) => {
    setLoading(recordName);
    setErr(null);
    clearSignal();
    setUploadState({ status: "uploading", progress: 30, error: null, signal: null });
    try {
      const signal = await loadWFDBSample(recordName);
      setUploadState({ status: "complete", progress: 100, signal });
      setSelectedLead(signal.leads[0]?.name ?? "MLII");
      setSignalReady(signal.id);
      // eslint-disable-next-line no-console
      console.log(
        "[WFDB] loaded",
        recordName,
        "samples=",
        signal.leads[0]?.signal.length,
        "fs=",
        signal.samplingRate
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load sample";
      setErr(msg);
      setUploadState({ status: "error", error: msg, signal: null });
    }
    setLoading(null);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-med-primary" />
        <h2 className="text-lg font-semibold">PhysioNet Samples</h2>
      </div>
      <p className="text-sm text-text-secondary mb-4">
        Real 30-second recordings from MIT-BIH, AFDB, and NSRDB databases (bundled offline).
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {WFDB_SAMPLES.map((s) => (
          <GlassCard key={s.recordName} padding="p-4" hover>
            <div className="flex items-start justify-between mb-2">
              <span className="font-mono text-sm font-bold">
                {s.database}/{s.recordName}
              </span>
              <MedBadge label={s.type} variant={s.type as Severity} size="sm" />
            </div>
            <p className="text-sm text-text-secondary mb-3">{s.condition}</p>
            <button
              onClick={() => handleLoad(s.recordName)}
              disabled={loading === s.recordName}
              className="w-full py-2 rounded-xl bg-med-primary/10 text-med-primary text-xs font-medium hover:bg-med-primary/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === s.recordName ? <Spinner size="sm" /> : "Load Record"}
            </button>
          </GlassCard>
        ))}
      </div>
      {err && <p className="mt-3 text-sm text-med-danger">{err}</p>}
    </div>
  );
}
