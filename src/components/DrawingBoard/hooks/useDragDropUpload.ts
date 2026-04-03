"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUploadProgress } from "@/app/contexts/UploadProgress.context";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
]);
const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/x-m4a",
  "audio/flac",
]);

export function useDragDropUpload({
  onAddImage,
  onAddVideo,
  onAddAudio,
}: {
  onAddImage: (url: string, dropPoint?: { x: number; y: number }) => void;
  onAddVideo: (url: string, dropPoint?: { x: number; y: number }) => void;
  onAddAudio: (url: string, dropPoint?: { x: number; y: number }, trackName?: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);
  const activeXhrsRef = useRef<Set<XMLHttpRequest>>(new Set());
  const { startUpload, updateProgress, completeUpload } = useUploadProgress();

  useEffect(() => {
    return () => {
      activeXhrsRef.current.forEach(x => x.abort());
      activeXhrsRef.current.clear();
    };
  }, []);

  const uploadFile = useCallback(
    (file: File, dropPoint: { x: number; y: number }) => {
      const isVideo = VIDEO_TYPES.has(file.type);
      const isAudio = AUDIO_TYPES.has(file.type);
      if (!isVideo && !isAudio && !IMAGE_TYPES.has(file.type)) return;

      const endpoint = isAudio ? "/api/upload-audio" : isVideo ? "/api/upload-video" : "/api/upload-image";
      const formData = new FormData();
      formData.append("file", file);

      startUpload();

      const xhr = new XMLHttpRequest();
      activeXhrsRef.current.add(xhr);
      xhr.open("POST", endpoint);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          updateProgress((event.loaded / event.total) * 100);
        }
      };

      xhr.onload = () => {
        activeXhrsRef.current.delete(xhr);
        completeUpload();
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            if (json.url) {
              if (isAudio) onAddAudio(json.url, dropPoint, json.trackName);
              else if (isVideo) onAddVideo(json.url, dropPoint);
              else onAddImage(json.url, dropPoint);
            }
          } catch {
            // ignore JSON parse errors
          }
        }
      };

      xhr.onerror = () => { activeXhrsRef.current.delete(xhr); completeUpload(); };
      xhr.onabort = () => { activeXhrsRef.current.delete(xhr); };

      xhr.send(formData);
    },
    [startUpload, updateProgress, completeUpload, onAddImage, onAddVideo, onAddAudio],
  );

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (Array.from(e.dataTransfer.types).includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragLeave = useCallback(() => {
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      const dropPoint = { x: e.clientX, y: e.clientY };
      Array.from(e.dataTransfer.files).forEach((file) => uploadFile(file, dropPoint));
    },
    [uploadFile],
  );

  return { isDragOver, onDragEnter, onDragOver, onDragLeave, onDrop };
}
