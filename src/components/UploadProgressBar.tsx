"use client";

import { useUploadProgress } from "@/app/contexts/UploadProgress.context";

export function UploadProgressBar() {
  const { progress } = useUploadProgress();

  if (progress === null) return null;

  return (
    <div
      className="fixed top-0 left-0 w-full z-[9999] h-[3px] bg-transparent pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-accent transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "200ms" : "300ms",
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: "width, opacity",
        }}
      />
    </div>
  );
}
