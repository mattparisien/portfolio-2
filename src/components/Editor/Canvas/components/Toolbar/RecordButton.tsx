"use client";

import { useState, useRef, useEffect } from "react";
import { ToolButton } from "./ToolButton";

type RecordState = "idle" | "selecting" | "recording";

interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Self-contained screen-region recorder.
 *
 * Flow:
 *  1. Click record button → "selecting" state — fullscreen crosshair overlay
 *  2. Drag to choose area → getDisplayMedia permission prompt
 *  3. Frames from the captured stream are blitted (cropped) onto an offscreen
 *     canvas, which is recorded with MediaRecorder
 *  4. Click the stop button (or press Esc/use browser stop pill) → .webm download
 */
export function RecordButton() {
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [elapsed, setElapsed]         = useState(0);
  const [dragStart, setDragStart]     = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // All mutable recording state lives in refs so closures never go stale
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<BlobPart[]>([]);
  const rafRef      = useRef<number | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  // Keep a stable ref to the cleanup function (avoids including it in dep arrays)
  const cleanupRef = useRef<() => void>(() => {/* noop until populated */});
  cleanupRef.current = () => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
    if (rafRef.current  !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // Cleanup on unmount
  useEffect(() => () => cleanupRef.current(), []);

  // ── Stop recording ────────────────────────────────────────────────────────
  const stopRecording = () => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
    if (rafRef.current  !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    // recorder.onstop handles tracks + download + state reset
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  // ── Start recording a cropped region ─────────────────────────────────────
  const startRecording = async (sel: SelectionRect) => {
    if (sel.w < 10 || sel.h < 10) { setRecordState("idle"); return; }

    try {
      // 'preferCurrentTab' and 'selfBrowserSurface' are Chrome extras not yet
      // in the TypeScript lib — cast to suppress the error.
      const stream = await (navigator.mediaDevices as unknown as {
        getDisplayMedia(c: unknown): Promise<MediaStream>;
      }).getDisplayMedia({
        video: { frameRate: { ideal: 30 }, cursor: "always" },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
      });

      streamRef.current = stream;

      // Offscreen canvas receives cropped frames at the selection's natural size
      const canvas     = document.createElement("canvas");
      canvas.width     = Math.round(sel.w);
      canvas.height    = Math.round(sel.h);
      const ctx        = canvas.getContext("2d")!;

      const vid        = document.createElement("video");
      vid.srcObject    = stream;
      vid.muted        = true;

      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("video metadata timeout")), 8000);
        vid.onloadedmetadata = () => { clearTimeout(t); vid.play().then(resolve).catch(resolve); };
      });

      // Translate CSS-px selection coords into the captured video's coordinate space
      const scaleX = vid.videoWidth  / window.innerWidth;
      const scaleY = vid.videoHeight / window.innerHeight;
      const srcX   = sel.x * scaleX;
      const srcY   = sel.y * scaleY;
      const srcW   = sel.w * scaleX;
      const srcH   = sel.h * scaleY;

      const drawFrame = () => {
        ctx.drawImage(vid, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
        rafRef.current = requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const mimeType =
        ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
          .find(m => MediaRecorder.isTypeSupported(m)) ?? "video/webm";

      const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        cleanupRef.current();
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
        chunksRef.current = [];
        setRecordState("idle");
        setElapsed(0);
      };

      // Handle "Stop sharing" from the browser's native pill
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
          recorderRef.current = null;
        }
      });

      recorderRef.current = recorder;
      recorder.start(100);
      setRecordState("recording");
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch {
      // User cancelled the permission dialog, or API not supported
      cleanupRef.current();
      setRecordState("idle");
    }
  };

  // ── ESC cancels selection mode ────────────────────────────────────────────
  useEffect(() => {
    if (recordState !== "selecting") return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setRecordState("idle"); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [recordState]);

  // ── Drag event handlers for the selection overlay ─────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragCurrent({ x: e.clientX, y: e.clientY });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart) return;
    setDragCurrent({ x: e.clientX, y: e.clientY });
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!dragStart) return;
    const end = { x: e.clientX, y: e.clientY };
    const sel: SelectionRect = {
      x: Math.min(dragStart.x, end.x),
      y: Math.min(dragStart.y, end.y),
      w: Math.abs(end.x - dragStart.x),
      h: Math.abs(end.y - dragStart.y),
    };
    setDragStart(null);
    setDragCurrent(null);
    startRecording(sel);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Recording state — render a stop button ────────────────────────────────
  if (recordState === "recording") {
    return (
      <ToolButton
        active
        onClick={stopRecording}
        title={`Stop recording — ${fmt(elapsed)}`}
        activeClass="bg-red-500 text-white"
      >
        <div className="flex items-center gap-1 px-0.5">
          {/* Stop square */}
          <div className="w-2.5 h-2.5 rounded-[2px] bg-white flex-shrink-0" />
          <span className="text-[10px] font-mono text-white tabular-nums leading-none">
            {fmt(elapsed)}
          </span>
        </div>
      </ToolButton>
    );
  }

  // ── Idle / selecting state ────────────────────────────────────────────────
  return (
    <>
      <ToolButton
        active={recordState === "selecting"}
        onClick={() => setRecordState(s => s === "selecting" ? "idle" : "selecting")}
        title={recordState === "selecting" ? "Cancel recording (Esc)" : "Record screen region"}
        activeClass="text-red-500"
      >
        {/* Concentric-circle record icon */}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle
            cx="11" cy="11" r="8.5"
            strokeWidth="0.7"
            className={recordState === "selecting" ? "stroke-red-500" : "stroke-overlay-fg"}
          />
          <circle
            cx="11" cy="11" r="4.5"
            className={recordState === "selecting" ? "fill-red-500" : "fill-overlay-fg"}
          />
        </svg>
      </ToolButton>

      {/* ── Full-screen selection overlay ─────────────────────────────────── */}
      {recordState === "selecting" && (
        <div
          className="fixed inset-0 z-[9900]"
          style={{ cursor: "crosshair" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          {/* Dimmed background with a bright "hole" over the selected area */}
          {dragStart && dragCurrent ? (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <mask id="record-region-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={Math.min(dragStart.x, dragCurrent.x)}
                    y={Math.min(dragStart.y, dragCurrent.y)}
                    width={Math.abs(dragCurrent.x - dragStart.x)}
                    height={Math.abs(dragCurrent.y - dragStart.y)}
                    fill="black"
                  />
                </mask>
              </defs>
              {/* Dim everything outside the selection */}
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.35)" mask="url(#record-region-mask)" />
              {/* Dashed border around the active selection */}
              <rect
                x={Math.min(dragStart.x, dragCurrent.x)}
                y={Math.min(dragStart.y, dragCurrent.y)}
                width={Math.abs(dragCurrent.x - dragStart.x)}
                height={Math.abs(dragCurrent.y - dragStart.y)}
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              {/* Size readout */}
              <text
                x={Math.min(dragStart.x, dragCurrent.x) + 4}
                y={Math.min(dragStart.y, dragCurrent.y) - 7}
                fill="white"
                fontSize="11"
                fontFamily="ui-monospace, monospace"
              >
                {Math.abs(Math.round(dragCurrent.x - dragStart.x))} ×{" "}
                {Math.abs(Math.round(dragCurrent.y - dragStart.y))}
              </text>
            </svg>
          ) : (
            /* Uniform dim before dragging starts */
            <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          )}

          {/* Instruction banner */}
          <div
            className="absolute top-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm font-medium text-white pointer-events-none select-none"
            style={{
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              whiteSpace: "nowrap",
            }}
          >
            Drag to select a region to record · <kbd className="font-mono">Esc</kbd> to cancel
          </div>
        </div>
      )}
    </>
  );
}
