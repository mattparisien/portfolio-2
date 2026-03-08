"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface MediaItem {
  url: string;
  type: "image" | "video";
  width: number | null;
  height: number | null;
}

interface UploadsPopoverProps {
  onSelect: (url: string) => void;
}

export default function UploadsPopover({ onSelect }: UploadsPopoverProps) {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cloudinary-images");
      const json = await res.json();
      setImages((json.media ?? []).filter((m: MediaItem) => m.type === "image"));
    } catch {
      setError("Failed to load images");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = "";

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
      } else {
        // Refresh the image list
        await fetchImages();
      }
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2" style={{ width: "min(380px, calc(100vw - 100px))" }}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-700">Uploads</span>
        <button
          title="Upload image"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "#000", color: "#fff" }}
        >
          {uploading ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
              </svg>
              Upload
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
        {loading ? (
          <div style={{ columns: 3, columnGap: 8 }}>
            {[80, 110, 60, 100, 75, 90, 120, 65, 95].map((h, i) => (
              <div
                key={i}
                className="rounded-lg bg-gray-100 animate-pulse mb-2 break-inside-avoid"
                style={{ height: h, display: "block" }}
              />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 opacity-30">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
            <p className="text-xs">No uploaded images yet</p>
            <p className="text-xs opacity-70">Click Upload to add your first image</p>
          </div>
        ) : (
          <div style={{ columns: 3, columnGap: 8 }}>
            {images.map((img, i) => (
              <button
                key={i}
                title="Add to canvas"
                onClick={() => onSelect(img.url)}
                className="rounded-lg overflow-hidden hover:opacity-80 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-black mb-2 break-inside-avoid w-full cursor-pointer"
                style={{ display: "block" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt="Uploaded image"
                  loading="lazy"
                  className="w-full h-auto block"
                  style={{ minHeight: 40, background: "#f3f4f6" }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
