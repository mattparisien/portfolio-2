"use client";

import { useState, useRef, useEffect } from "react";
import { ToolButton } from "./ToolButton";

type RecordState = "idle" | "selecting" | "recording";

interface SelectionRect { x: number; y: number; w: number; h: number }
interface DragPoint     { x: number; y: number }

/**
 * Self-contained screen-region recorder.
 *
 * Flow:
 *  1. Click button → "selecting" — crosshair + dim overlay
 *  2. Drag to pick area → "confirming" — frozen region preview + action bar
 *  3. Click "Record" → getDisplayMedia → "recording"
 *  4. Click stop → .mp4 download
 *
 * Event strategy:
 *  Fabric.js moves mousemove+mouseup to *document* on any canvas drag, which
 *  would hijack our overlay.  We use window capture-phase listeners +
 *  stopImmediatePropagation() to intercept before Fabric's handlers run.
 *
 *  The overlays use pointer-events:none so the toolbar button remains
 *  clickable through them (the drag still works — it's handled by the
 *  capture-phase window listeners, not by the overlay div).
 *  The cursor is applied to document.body so it shows even with
 *  pointer-events:none on the overlay.
 */
export function RecordButton() {
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [elapsed, setElapsed]         = useState(0);
  const [dragVis, setDragVis]         = useState<{ start: DragPoint; cur: DragPoint } | null>(null);

  const dragStartRef = useRef<DragPoint | null>(null);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<BlobPart[]>([]);
  const rafRef       = useRef<number | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);

  const cleanupRef = useRef<() => void>(() => {});
  cleanupRef.current = () => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
    if (rafRef.current   !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => cleanupRef.current(), []);

  // ── Apply crosshair cursor to body while selecting ────────────────────────
  useEffect(() => {
    if (recordState === "selecting") {
      document.body.style.cursor = "crosshair";
      return () => { document.body.style.cursor = ""; };
    }
  }, [recordState]);

  // ── Reset helper (shared by cancel buttons + ESC) ─────────────────────────
  const cancelAll = () => {
    dragStartRef.current = null;
    setDragVis(null);
    setRecordState("idle");
  };

  // ── Stop recording ────────────────────────────────────────────────────────
  const stopRecording = () => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
    if (rafRef.current   !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  // ── Start recording — stored in ref so it's never stale in event handlers ─
  const startRecordingRef = useRef<(sel: SelectionRect) => Promise<void>>(async () => {});
  startRecordingRef.current = async (sel: SelectionRect) => {
    if (sel.w < 10 || sel.h < 10) { setRecordState("idle"); return; }
    try {
      const stream = await (navigator.mediaDevices as unknown as {
        getDisplayMedia(c: unknown): Promise<MediaStream>;
      }).getDisplayMedia({
        video: { frameRate: { ideal: 30 }, cursor: "always" },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
      });
      streamRef.current = stream;

      const canvas  = document.createElement("canvas");
      canvas.width  = Math.round(sel.w);
      canvas.height = Math.round(sel.h);
      const ctx     = canvas.getContext("2d")!;
      const vid     = document.createElement("video");
      vid.srcObject = stream;
      vid.muted     = true;

      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("timeout")), 8000);
        vid.onloadedmetadata = () => { clearTimeout(t); vid.play().then(resolve).catch(resolve); };
      });

      const scaleX = vid.videoWidth  / window.innerWidth;
      const scaleY = vid.videoHeight / window.innerHeight;
      const drawFrame = () => {
        ctx.drawImage(vid, sel.x * scaleX, sel.y * scaleY, sel.w * scaleX, sel.h * scaleY,
                          0, 0, canvas.width, canvas.height);
        rafRef.current = requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const mimeType =
        ["video/mp4;codecs=avc1", "video/mp4;codecs=avc1.42E01E", "video/mp4",
         "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
          .find(m => MediaRecorder.isTypeSupported(m)) ?? "video/webm";
      const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";

      const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        cleanupRef.current();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement("a"), { href: url, download: `recording-${Date.now()}.${ext}` });
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
        chunksRef.current = [];
        setRecordState("idle");
        setElapsed(0);
      };
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") { recorderRef.current.stop(); recorderRef.current = null; }
      });

      recorderRef.current = recorder;
      recorder.start(100);
      setRecordState("recording");
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch {
      cleanupRef.current();
      setRecordState("idle");
    }
  };

  // ── Window capture-phase listeners — only active while "selecting" ─────────
  useEffect(() => {
    if (recordState !== "selecting") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelAll();
    };
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      const pt = { x: e.clientX, y: e.clientY };
      dragStartRef.current = pt;
      setDragVis({ start: pt, cur: pt });
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      e.stopImmediatePropagation();
      setDragVis(prev => prev ? { ...prev, cur: { x: e.clientX, y: e.clientY } } : null);
    };
    const onMouseUp = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      e.stopImmediatePropagation();
      const sel: SelectionRect = {
        x: Math.min(start.x, e.clientX), y: Math.min(start.y, e.clientY),
        w: Math.abs(e.clientX - start.x), h: Math.abs(e.clientY - start.y),
      };
      dragStartRef.current = null;
      setDragVis(null);
      if (sel.w < 10 || sel.h < 10) return;
      // Fire immediately from this mouseup — it counts as a user gesture
      startRecordingRef.current(sel);
    };

    window.addEventListener("keydown",   onKeyDown,   { capture: true });
    window.addEventListener("mousedown", onMouseDown, { capture: true });
    window.addEventListener("mousemove", onMouseMove, { capture: true });
    window.addEventListener("mouseup",   onMouseUp,   { capture: true });
    return () => {
      window.removeEventListener("keydown",   onKeyDown,   { capture: true });
      window.removeEventListener("mousedown", onMouseDown, { capture: true });
      window.removeEventListener("mousemove", onMouseMove, { capture: true });
      window.removeEventListener("mouseup",   onMouseUp,   { capture: true });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordState]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const isActive = recordState === "selecting";

  // ── Single unified return — ToolButton always present in toolbar ──────────
  return (
    <>
      {/* Toolbar button — always rendered so it never vanishes from the toolbar */}
      {recordState === "recording" ? (
        <ToolButton active onClick={stopRecording} title={`Stop — ${fmt(elapsed)}`} activeClass="bg-red-500 text-white">
          <div className="flex items-center gap-1 px-0.5">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-white flex-shrink-0" />
            <span className="text-[10px] font-mono text-white tabular-nums leading-none">{fmt(elapsed)}</span>
          </div>
        </ToolButton>
      ) : (
        <ToolButton
          active={isActive}
          onClick={() => isActive ? cancelAll() : setRecordState("selecting")}
          title={isActive ? "Cancel (Esc)" : "Record screen region"}
          activeClass="text-red-500"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="8.5" strokeWidth="0.7"
              className={isActive ? "stroke-red-500" : "stroke-overlay-fg"} />
            <circle cx="11" cy="11" r="4.5"
              className={isActive ? "fill-red-500" : "fill-overlay-fg"} />
          </svg>
        </ToolButton>
      )}

      {/* ── Selecting overlay — pointer-events:none so toolbar stays clickable.
              The drag is captured by the window capture listeners, so
              pointer-events on this div doesn't affect drag tracking. */}
      {recordState === "selecting" && (
        <div className="fixed inset-0 z-[9900] pointer-events-none">
          {dragVis ? (
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <mask id="rec-sel-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={Math.min(dragVis.start.x, dragVis.cur.x)}
                    y={Math.min(dragVis.start.y, dragVis.cur.y)}
                    width={Math.abs(dragVis.cur.x - dragVis.start.x)}
                    height={Math.abs(dragVis.cur.y - dragVis.start.y)}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.35)" mask="url(#rec-sel-mask)" />
              <rect
                x={Math.min(dragVis.start.x, dragVis.cur.x)}
                y={Math.min(dragVis.start.y, dragVis.cur.y)}
                width={Math.abs(dragVis.cur.x - dragVis.start.x)}
                height={Math.abs(dragVis.cur.y - dragVis.start.y)}
                fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="5 3"
              />
              <text
                x={Math.min(dragVis.start.x, dragVis.cur.x) + 4}
                y={Math.min(dragVis.start.y, dragVis.cur.y) - 7}
                fill="white" fontSize="11" fontFamily="ui-monospace,monospace"
              >
                {Math.abs(Math.round(dragVis.cur.x - dragVis.start.x))} × {Math.abs(Math.round(dragVis.cur.y - dragVis.start.y))}
              </text>
            </svg>
          ) : (
            <div className="absolute inset-0 bg-black/30" />
          )}
          <div
            className="absolute top-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-sm font-medium text-white select-none"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", whiteSpace: "nowrap" }}
          >
            Drag to select a region · <kbd className="font-mono">Esc</kbd> to cancel
          </div>
        </div>
      )}
    </>
  );
}
