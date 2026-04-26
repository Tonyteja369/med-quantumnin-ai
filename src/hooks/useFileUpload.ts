import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useECGStore } from "@/store/useECGStore";
import { uploadCsvFile } from "@/api/ecgApi";

export function useFileUpload() {
  const setUploadState = useECGStore((s) => s.setUploadState);
  const setSignalReady = useECGStore((s) => s.setSignalReady);
  const setSelectedLead = useECGStore((s) => s.setSelectedLead);
  const clearSignal = useECGStore((s) => s.clearSignal);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      if (file.size > 50 * 1024 * 1024) {
        setError("File too large. Maximum 50MB.");
        return;
      }
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".csv")) {
        setError(
          "Only .csv uploads are supported in-browser. PhysioNet samples can be loaded from the panel on the left."
        );
        return;
      }
      setError(null);
      clearSignal();
      setUploadState({ status: "uploading", progress: 0, error: null, signal: null });

      try {
        const signal = await uploadCsvFile(file, (progress) => {
          setUploadState({ progress });
        });
        setUploadState({ status: "complete", progress: 100, signal });
        setSelectedLead(signal.leads[0]?.name ?? "Lead 1");
        setSignalReady(signal.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setError(msg);
        setUploadState({ status: "error", error: msg, signal: null });
      }
    },
    [setUploadState, setSignalReady, setSelectedLead, clearSignal]
  );

  const dropzone = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  return { ...dropzone, error };
}
