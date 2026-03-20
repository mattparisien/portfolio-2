"use client";

import { useState, useRef, useEffect } from "react";
import { ToolButton } from "./ToolButton";

type RecordState = "idle" | "selecting" | "recording";

interface SelectionRect { x: number; y: number; w: number; h: number }
interface DragPoint     { x: number; y: number }

/**
 * WHY getDisplayMedia is called on the initial button click (not on mouseup):
 *
 * Browsers require getDisplayMedia() to be called inside a "transient user
 * activation" — essentially a direct user gesture.  A mouseup that fires after
 * a canvas drag (intercepted via capture-phase window listeners with
 * stopImmediatePropagation) is NOT recognised as a user gesture in Chrome /
 * Safari, so the call throws NotAllowedError silently and recording never starts.
 *
 * Fix: acquire the MediaStream on the button onClick (guaranteed gesture),
 * store it in streamRef, then when the region drag completes just start
 * MediaRecorder on the already-open stream — no second permission call needed.
 */

export function RecordButton() {
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [loading, setLoading]         = useState(false);
  const [elapsed, setElapsed]         = useState(0);
  const [dragVis, setDragVis]         = useState<{ start: DragPoint; cur: DragPoint } | null>(null);

  const dragStartRef = useRef<DragPoint | null>(null);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<BlobPart[]>([]);
  const rafRef       = useRef<number | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const vidRef       = useRef<HTMLVideoElement | null>(null);

  const cleanupRef = useRef<() => void>(() => {});
  cleanupRef.current = () => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
    if (rafRef.current   !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    vidRef.current    = null;
  };

  useEffect(() => () => cleanupRef.current(), []);

  // ── Escape key — cancel during selection ───────────────────────────────
  useEffect(() => {
    if (recordState !== "selecting") return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") cancelAll(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordState]);

  // ── Reset helper ──────────────────────────────────────────────────────────
  const cancelAll = () => {
    cleanupRef.current();
    dragStartRef.current = null;
    setDragVis(null);
    setLoading(false);
    setRecordState("idle");
  };

  // ── Stop recording ────────────────────────────────────────────────────────
  const stopRecording = () => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
    if (rafRef.current   !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  // ── Step 1 — acquire display stream on initial button click (user gesture) ─
  const startStreamRef = useRef<() => Promise<void>>(async () => {});
  startStreamRef.current = async () => {
    setLoading(true);
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

      const vid     = document.createElement("video");
      vid.srcObject = stream;
      vid.muted     = true;
      // Use addEventListener+once so we never miss the event if it fires early
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("timeout")), 8000);
        if (vid.readyState >= 1) {
          clearTimeout(t); vid.play().then(() => resolve()).catch(() => resolve());
        } else {
          vid.addEventListener("loadedmetadata", () => {
            clearTimeout(t); vid.play().then(() => resolve()).catch(() => resolve());
          }, { once: true });
        }
      });
      vidRef.current = vid;

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") { recorderRef.current.stop(); recorderRef.current = null; }
        else { cancelAll(); }
      });

      setLoading(false);
      setRecordState("selecting");
    } catch {
      cleanupRef.current();
      setLoading(false);
      setRecordState("idle");
    }
  };

  // ── Step 2 — start MediaRecorder once region is drawn (no getDisplayMedia) ─
  // Stored in a ref so the closure inside onMouseUp is never stale.
  const startRecordingFromStreamRef = useRef<(sel: SelectionRect) => void>(() => {});
  startRecordingFromStreamRef.current = (sel: SelectionRect) => {
    try {
      const vid = vidRef.current;
      if (!vid) { cancelAll(); return; }
      if (sel.w < 10 || sel.h < 10) { cancelAll(); return; }

      const canvas  = document.createElement("canvas");
      canvas.width  = Math.round(sel.w);
      canvas.height = Math.round(sel.h);
      const ctx     = canvas.getContext("2d");
      if (!ctx) { cancelAll(); return; }

      // videoWidth may still be 0 on the first frame — guard against divide-by-zero
      const scaleX  = vid.videoWidth  ? vid.videoWidth  / window.innerWidth  : 1;
      const scaleY  = vid.videoHeight ? vid.videoHeight / window.innerHeight : 1;
      const drawFrame = () => {
        try {
          ctx.drawImage(vid, sel.x * scaleX, sel.y * scaleY, sel.w * scaleX, sel.h * scaleY,
                            0, 0, canvas.width, canvas.height);
        } catch { /* video not ready yet — skip frame */ }
        rafRef.current = requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const mimeType =
        ["video/mp4;codecs=avc1", "video/mp4;codecs=avc1.42E01E", "video/mp4",
         "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
          .find(m => MediaRecorder.isTypeSupported(m)) ?? "";

      // Try with preferred mimeType first, then let the browser choose
      let recorder: MediaRecorder;
      try {
        recorder = mimeType
          ? new MediaRecorder(canvas.captureStream(30), { mimeType })
          : new MediaRecorder(canvas.captureStream(30));
      } catch {
        recorder = new MediaRecorder(canvas.captureStream(30));
      }

      const actualMime = recorder.mimeType || mimeType;
      const ext        = actualMime.startsWith("video/mp4") ? "mp4" : "webm";

      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        cleanupRef.current();
        const blob = new Blob(chunksRef.current, { type: actualMime });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement("a"), { href: url, download: `recording-${Date.now()}.${ext}` });
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
        chunksRef.current = [];
        setRecordState("idle");
        setElapsed(0);
      };

      recorderRef.current = recorder;
      recorder.start(100);
      setRecordState("recording");
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch (err) {
      console.error("[RecordButton] failed to start recording:", err);
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      // Stay in "selecting" so the user can try dragging again
      dragStartRef.current = null;
      setDragVis(null);
    }
  };

  // ── Window capture-phase listeners removed — handled by overlay div instead ─
  // (The full-screen overlay has pointer-events:auto and React onMouse* handlers,
  //  which is more reliable than capture-phase tricks + pointer-events:none.)

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const isSelecting = recordState === "selecting";

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
          active={isSelecting}
          onClick={() => {
            if (loading) return;
            if (isSelecting) { cancelAll(); return; }
            startStreamRef.current();
          }}
          title={loading ? "Opening screen share…" : isSelecting ? "Cancel (Esc)" : "Record screen region"}
          activeClass="text-red-500"
        >
          {loading ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
              <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8.5" strokeWidth="0.7"
                className={isSelecting ? "stroke-red-500" : "stroke-overlay-fg"} />
              <circle cx="11" cy="11" r="4.5"
                className={isSelecting ? "fill-red-500" : "fill-overlay-fg"} />
            </svg>
          )}
        </ToolButton>
      )}

      {/* ── Selecting overlay — pointer-events:auto so React events fire directly
              on this div. No capture-phase tricks needed; the overlay sits on top
              of everything (z-9900) so Fabric never sees these mouse events. */}
      {recordState === "selecting" && (
        <div
          className="fixed inset-0 z-[9900] cursor-crosshair select-none"
          onMouseDown={(e) => {
            // Let [data-record-cancel] buttons pass through
            if ((e.target as HTMLElement).closest("[data-record-cancel]")) return;
            e.preventDefault();
            const pt = { x: e.clientX, y: e.clientY };
            dragStartRef.current = pt;
            setDragVis({ start: pt, cur: pt });
          }}
          onMouseMove={(e) => {
            if (!dragStartRef.current) return;
            setDragVis(prev => prev ? { ...prev, cur: { x: e.clientX, y: e.clientY } } : null);
          }}
          onMouseUp={(e) => {
            const start = dragStartRef.current;
            if (!start) return;
            const sel: SelectionRect = {
              x: Math.min(start.x, e.clientX), y: Math.min(start.y, e.clientY),
              w: Math.abs(e.clientX - start.x), h: Math.abs(e.clientY - start.y),
            };
            dragStartRef.current = null;
            setDragVis(null);
            startRecordingFromStreamRef.current(sel);
          }}
        >
          {dragVis ? (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
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
            <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          )}
          <div
            className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", whiteSpace: "nowrap" }}
          >
            <span className="select-none">Drag to select a region</span>
            <button
              data-record-cancel
              onClick={cancelAll}
              className="text-[11px] font-normal opacity-60 hover:opacity-100 transition-opacity px-2 py-0.5 rounded border border-white/30 hover:border-white/60 cursor-pointer"
            >
              Cancel
            </button>
            <span className="opacity-40 text-[11px] select-none"><kbd className="font-mono">Esc</kbd></span>
          </div>
        </div>
      )}
    </>
  );
}
