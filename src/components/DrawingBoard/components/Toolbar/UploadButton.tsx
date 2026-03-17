"use client";

import { useEffect, useRef, useState } from "react";
import { ToolButton } from "./ToolButton";
import { makeIcons } from "./toolConfig";

interface UploadButtonProps {
  onAddImage?: (url: string) => void;
  uploadSignal?: number;
}

export function UploadButton({ onAddImage, uploadSignal }: UploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uploadSignal) return;
    fileRef.current?.click();
  }, [uploadSignal]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok && json.url) onAddImage?.(json.url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <ToolButton
        active={false}
        onClick={() => fileRef.current?.click()}
        title="Upload image"
        disabled={uploading}
      >
        {uploading ? (
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          makeIcons().find(i => i.type === "upload")?.icon
        )}
      </ToolButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
