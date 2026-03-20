"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface MediaItem {
  url: string;
  type: "image" | "video";
  width: number | null;
  height: number | null;
}

interface UploadsPopoverProps {
  onSelect: (url: string, type: "image" | "video") => void;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export default function UploadsPopover({ onSelect }: UploadsPopoverProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadedUrls(new Set());
    try {
      const res = await fetch("/api/cloudinary-images");
      const json = await res.json();
      setMedia(json.media ?? []);
    } catch {
      setError("Failed to load media");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isVideo = VIDEO_TYPES.includes(file.type);
    const isImage = IMAGE_TYPES.includes(file.type);
    if (!isImage && !isVideo) {
      setError("Unsupported file type.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint = isVideo ? "/api/upload-video" : "/api/upload-image";
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
      } else {
        await fetchMedia();
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
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-700">Uploads</span>
      </div>

      {/* Full-width upload button */}
      <button
        title="Upload image or video"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
        style={{ background: "#000", color: "#fff" }}
      >
        {uploading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Uploading…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
            </svg>
            Upload Image or Video
          </>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(",")}
        className="hidden"
        onChange={handleFileChange}
      />

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
        ) : media.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 opacity-30">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
            <p className="text-xs">No uploads yet</p>
            <p className="text-xs opacity-70">Click Upload to add an image or video</p>
          </div>
        ) : (
          <div style={{ columns: 3, columnGap: 8 }}>
            {media.map((item, i) => {
              const aspectRatio =
                item.width && item.height ? item.width / item.height : null;

              if (item.type === "video") {
                return (
                  <button
                    key={item.url || i}
                    title="Add video to canvas"
                    onClick={() => onSelect(item.url, "video")}
                    className="rounded-lg overflow-hidden hover:opacity-80 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-black mb-2 break-inside-avoid w-full cursor-pointer relative"
                    style={{ display: "block" }}
                  >
                    <div
                      className="relative w-full bg-gray-900"
                      style={aspectRatio ? { aspectRatio: String(aspectRatio) } : { minHeight: 60 }}
                    >
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video
                        src={item.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover block"
                        style={{ minHeight: 40 }}
                        onLoadedData={() =>
                          setLoadedUrls((prev) => new Set(prev).add(item.url))
                        }
                      />
                      {/* Play badge */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/50 rounded-full p-1.5">
                          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              }

              // Image
              const isLoaded = loadedUrls.has(item.url);
              return (
                <button
                  key={item.url || i}
                  title="Add to canvas"
                  onClick={() => onSelect(item.url, "image")}
                  className="rounded-lg overflow-hidden hover:opacity-80 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-black mb-2 break-inside-avoid w-full cursor-pointer"
                  style={{ display: "block" }}
                >
                  <div
                    className="relative w-full"
                    style={aspectRatio ? { aspectRatio: String(aspectRatio) } : { minHeight: 40 }}
                  >
                    {!isLoaded && (
                      <div className="absolute inset-0 animate-pulse bg-gray-100" />
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt="Uploaded image"
                      loading="lazy"
                      className="w-full h-auto block"
                      style={{
                        minHeight: 40,
                        background: "#f3f4f6",
                        opacity: isLoaded ? 1 : 0,
                        transition: "opacity 0.25s ease",
                      }}
                      onLoad={() =>
                        setLoadedUrls((prev) => new Set(prev).add(item.url))
                      }
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

