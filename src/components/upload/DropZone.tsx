import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, CheckCircle } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useECGStore } from "@/store/useECGStore";
import { Spinner } from "@/components/med/Spinner";

export function DropZone() {
  const { getRootProps, getInputProps, isDragActive, error } = useFileUpload();
  const uploadState = useECGStore((s) => s.uploadState);

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
        isDragActive
          ? "border-med-primary bg-med-primary/5"
          : "border-border hover:border-med-primary/40"
      }`}
    >
      <input {...getInputProps()} />
      <AnimatePresence mode="wait">
        {uploadState.status === "uploading" ? (
          <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm font-medium">Uploading... {uploadState.progress}%</p>
            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full medical-gradient rounded-full transition-all" style={{ width: `${uploadState.progress}%` }} />
            </div>
          </motion.div>
        ) : uploadState.status === "complete" && uploadState.signal ? (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-med-secondary" />
            <p className="text-sm font-medium text-med-secondary">Uploaded: {uploadState.signal.filename}</p>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
            <UploadCloud className="w-12 h-12 text-text-muted" />
            <p className="font-medium">Drop ECG files here</p>
            <p className="text-sm text-text-muted">Supports .dat .hea .csv .edf — up to 50MB</p>
            <button className="mt-2 px-4 py-2 rounded-xl bg-med-primary/10 text-med-primary text-sm font-medium hover:bg-med-primary/20 transition-colors">
              Choose file
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="mt-3 text-sm text-med-danger">{error}</p>}
    </div>
  );
}
