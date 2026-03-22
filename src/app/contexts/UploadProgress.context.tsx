"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface UploadProgressContextValue {
  progress: number | null;
  startUpload: () => void;
  updateProgress: (p: number) => void;
  completeUpload: () => void;
}

const UploadProgressContext = createContext<UploadProgressContextValue | null>(null);

export function UploadProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<number | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startUpload = useCallback(() => {
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    setProgress(0);
  }, []);

  const updateProgress = useCallback((p: number) => {
    // Cap progress at 90 — the remaining 10% is reserved for server-side processing
    setProgress(Math.min(p * 0.9, 90));
  }, []);

  const completeUpload = useCallback(() => {
    setProgress(100);
    completeTimerRef.current = setTimeout(() => {
      setProgress(null);
    }, 600);
  }, []);

  return (
    <UploadProgressContext.Provider value={{ progress, startUpload, updateProgress, completeUpload }}>
      {children}
    </UploadProgressContext.Provider>
  );
}

export function useUploadProgress() {
  const ctx = useContext(UploadProgressContext);
  if (!ctx) throw new Error("useUploadProgress must be used within UploadProgressProvider");
  return ctx;
}
