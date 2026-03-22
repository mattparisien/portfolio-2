"use client";

import { useEffect, useRef, useState } from "react";
import { ToolButton } from "./ToolButton";
import { ICON_COLOR, makeIcons } from "./toolConfig";
import { useUploadProgress } from "@/app/contexts/UploadProgress.context";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/ogg"];

interface UploadButtonProps {
  onAddImage?: (url: string) => void;
  onAddVideo?: (url: string) => void;
  uploadSignal?: number;
}

export function UploadButton({ onAddImage, onAddVideo, uploadSignal }: UploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { startUpload, updateProgress, completeUpload } = useUploadProgress();

  useEffect(() => {
    if (!uploadSignal) return;
    fileRef.current?.click();
  }, [uploadSignal]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    startUpload();

    const isVideo = VIDEO_TYPES.includes(file.type);
    const endpoint = isVideo ? "/api/upload-video" : "/api/upload-image";
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        updateProgress((event.loaded / event.total) * 100);
      }
    };

    xhr.onload = () => {
      completeUpload();
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          if (json.url) {
            if (isVideo) onAddVideo?.(json.url);
            else onAddImage?.(json.url);
          }
        } catch {
          // ignore parse error
        }
      }
    };

    xhr.onerror = () => {
      completeUpload();
      setUploading(false);
    };

    xhr.send(formData);
  };

  return (
    <>
      <ToolButton
        active={false}
        onClick={() => fileRef.current?.click()}
        title="Upload image or video"
        disabled={uploading}
      >
        {uploading ? (
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          makeIcons(ICON_COLOR).find(i => i.type === "upload")?.icon
        )}
      </ToolButton>
      <input
        ref={fileRef}
        type="file"
        accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}

