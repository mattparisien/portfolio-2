"use client";

import { useState, useRef, useEffect } from "react";
import type { Tool, ShapeType } from "../types";
import GifPicker from "./GifPicker";

const SHAPES: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
  {
    type: "rect",
    label: "Rectangle",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <rect x="2" y="6" width="20" height="13" rx="2" />
      </svg>
    ),
  },
  {
    type: "circle",
    label: "Circle",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    type: "triangle",
    label: "Triangle",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <polygon points="12,3 22,21 2,21" />
      </svg>
    ),
  },
  {
    type: "star",
    label: "Star",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    ),
  },
  {
    type: "heart",
    label: "Heart",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 21C12 21 3 14 3 8.5A5.5 5.5 0 0 1 12 5.1 5.5 5.5 0 0 1 21 8.5C21 14 12 21 12 21Z" />
      </svg>
    ),
  },
];

interface DrawingToolsProps {
  tool: Tool;
  color: string;
  onToolChange: (t: Tool) => void;
  onAddShape: (shape: ShapeType) => void;
  onAddText: () => void;
  onAddGif: (id: string, url: string) => void;
  /** Incremented by the parent whenever another component opens a popover */
  closeSignal?: number;
  /** Called when this component opens any of its own popovers */
  onPopoverOpened?: () => void;
}

export default function DrawingTools({ tool, color, onToolChange, onAddShape, onAddText, onAddGif, closeSignal, onPopoverOpened }: DrawingToolsProps) {
  // pinned = user clicked to keep open; hover = mouse is over trigger or popover
  const [shapePinned, setShapePinned] = useState(false);
  const [shapeHover, setShapeHover]   = useState(false);
  const [gifPinned, setGifPinned]     = useState(false);
  const [gifHover, setGifHover]       = useState(false);
  const [drawPinned, setDrawPinned]   = useState(false);
  const [drawHover, setDrawHover]     = useState(false);

  // Close all when a sibling component opens a popover
  useEffect(() => {
    if (!closeSignal) return;
    setShapePinned(false); setShapeHover(false);
    setGifPinned(false);   setGifHover(false);
    setDrawPinned(false);  setDrawHover(false);
  }, [closeSignal]);

  const shapeOpen = shapePinned || shapeHover;
  const gifOpen   = gifPinned   || gifHover;
  const drawOpen  = drawPinned  || drawHover;

  const shapeRef      = useRef<HTMLButtonElement>(null);
  const popoverRef    = useRef<HTMLDivElement>(null);
  const gifRef        = useRef<HTMLButtonElement>(null);
  const gifPopoverRef = useRef<HTMLDivElement>(null);
  const drawRef       = useRef<HTMLButtonElement>(null);
  const drawPopoverRef= useRef<HTMLDivElement>(null);

  const shapeLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gifLeaveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawLeaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelShapeLeave = () => { if (shapeLeaveTimer.current) clearTimeout(shapeLeaveTimer.current); };
  const cancelGifLeave   = () => { if (gifLeaveTimer.current)   clearTimeout(gifLeaveTimer.current); };
  const cancelDrawLeave  = () => { if (drawLeaveTimer.current)  clearTimeout(drawLeaveTimer.current); };

  // click-outside dismisses only when pinned
  useEffect(() => {
    if (!shapePinned) return;
    const handler = (e: MouseEvent) => {
      if (
        !shapeRef.current?.contains(e.target as Node) &&
        !popoverRef.current?.contains(e.target as Node)
      ) {
        setShapePinned(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [shapePinned]);

  useEffect(() => {
    if (!gifPinned) return;
    const handler = (e: MouseEvent) => {
      if (
        !gifRef.current?.contains(e.target as Node) &&
        !gifPopoverRef.current?.contains(e.target as Node)
      ) {
        setGifPinned(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [gifPinned]);

  // (draw popover is closed only via the ✕ button or by opening another section)

  // Stop canvas scroll/touch handlers stealing events inside GIF popover
  useEffect(() => {
    const el = gifPopoverRef.current;
    if (!el || !gifOpen) return;
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener("wheel", stop, { passive: false });
    el.addEventListener("touchstart", stop, { passive: false });
    el.addEventListener("touchmove", stop, { passive: false });
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("touchmove", stop);
    };
  }, [gifOpen]);

  const toolBtn = (
    active: boolean,
    onClick: () => void,
    title: string,
    icon: React.ReactNode,
  ) => (
    <button
      title={title}
      onClick={onClick}
      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
      style={{
        background: active ? "#000" : "transparent",
        color: active ? "#fff" : "#111",
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.07)"; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      {icon}
    </button>
  );

  return (
    <div
      className="absolute top-5 left-5 flex flex-col gap-1 p-2 rounded-2xl shadow-xl z-[200]"
      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}
    >
      {/* Text */}
      {toolBtn(
        tool === "text",
        () => onAddText(),
        "Text",
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M4 6h16v2H4zM4 12h10v2H4zM4 18h7v2H4z" opacity="0" />
          <path d="M5 4v3h5.5v12h3V7H19V4z" />
        </svg>,
      )}

      {/* Draw popover: pencil, brush, select */}
      <div
        className="relative"
        onMouseEnter={() => { cancelDrawLeave(); setDrawHover(true); }}
        onMouseLeave={() => { drawLeaveTimer.current = setTimeout(() => setDrawHover(false), 120); }}
      >
        <button
          ref={drawRef}
          title="Draw"
          onClick={() => {
            if (drawPinned) {
              setDrawPinned(false);
              setDrawHover(false);
              onToolChange("select");
            } else {
              setDrawPinned(true);
              setShapePinned(false); setShapeHover(false); setGifPinned(false); setGifHover(false);
              onPopoverOpened?.();
            }
          }}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
          style={{
            background: drawPinned ? "#000" : (tool === "pencil" || tool === "brush" || tool === "eraser") && !drawOpen ? "#000" : drawHover ? "rgba(0,0,0,0.07)" : "transparent",
            color: drawPinned || ((tool === "pencil" || tool === "brush" || tool === "eraser") && !drawOpen) ? "#fff" : "#111",
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 1.5H5v-.92l9.06-9.06.92.92-9.06 9.06zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </button>

        {drawOpen && (
          <div
            ref={drawPopoverRef}
            className="absolute top-0 left-[calc(100%+10px)] flex gap-2 p-3 rounded-2xl shadow-xl"
            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)" }}
          >
            {/* Close button */}
            <button
              title="Close"
              onClick={() => { setDrawPinned(false); setDrawHover(false); onToolChange("select"); }}
              className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white text-gray-500 flex items-center justify-center text-[10px] leading-none cursor-pointer hover:text-black transition-colors z-10 shadow"
            >
              ✕
            </button>
            {/* Pencil */}
            <button
              title="Pencil"
              onClick={() => { onToolChange("pencil"); setDrawPinned(true); }}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors flex-1 min-w-[52px] cursor-pointer"
              style={{ background: tool === "pencil" ? "#000" : "transparent", color: tool === "pencil" ? "#fff" : "#111" }}
              onMouseEnter={e => { if (tool !== "pencil") (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.07)"; }}
              onMouseLeave={e => { if (tool !== "pencil") (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 1.5H5v-.92l9.06-9.06.92.92-9.06 9.06zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
              <span className="text-[10px] text-gray-500 leading-none" style={{ color: tool === "pencil" ? "#fff" : undefined }}>Pencil</span>
            </button>

            {/* Brush */}
            <button
              title="Brush"
              onClick={() => { onToolChange("brush"); setDrawPinned(true); }}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors flex-1 min-w-[52px] cursor-pointer"
              style={{ background: tool === "brush" ? "#000" : "transparent", color: tool === "brush" ? "#fff" : "#111" }}
              onMouseEnter={e => { if (tool !== "brush") (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.07)"; }}
              onMouseLeave={e => { if (tool !== "brush") (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a1 1 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 0 0 0-1.41z"/>
              </svg>
              <span className="text-[10px] text-gray-500 leading-none" style={{ color: tool === "brush" ? "#fff" : undefined }}>Brush</span>
            </button>

            {/* Select */}
            <button
              title="Select"
              onClick={() => { onToolChange("select"); setDrawPinned(true); }}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors flex-1 min-w-[52px] cursor-pointer"
              style={{ background: tool === "select" ? "#000" : "transparent", color: tool === "select" ? "#fff" : "#111" }}
              onMouseEnter={e => { if (tool !== "select") (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.07)"; }}
              onMouseLeave={e => { if (tool !== "select") (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M4 2 L4 18 L8.5 13.5 L11.5 20 L13.5 19 L10.5 12.5 L16 12.5 Z" />
              </svg>
              <span className="text-[10px] text-gray-500 leading-none" style={{ color: tool === "select" ? "#fff" : undefined }}>Select</span>
            </button>

            {/* Eraser */}
            <button
              title="Eraser"
              onClick={() => { onToolChange("eraser"); setDrawPinned(true); }}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors flex-1 min-w-[52px] cursor-pointer"
              style={{ background: tool === "eraser" ? "#000" : "transparent", color: tool === "eraser" ? "#fff" : "#111" }}
              onMouseEnter={e => { if (tool !== "eraser") (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.07)"; }}
              onMouseLeave={e => { if (tool !== "eraser") (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-9.5 9.5a1 1 0 0 0-.29.71V17a1 1 0 0 0 1 1h4a1 1 0 0 0 .71-.29l7.83-7.83zM10.88 16H9v-1.88l5.5-5.5 1.88 1.88L10.88 16z" />
                <path d="M3 21h18v-2H3z" />
              </svg>
              <span className="text-[10px] text-gray-500 leading-none" style={{ color: tool === "eraser" ? "#fff" : undefined }}>Eraser</span>
            </button>

          </div>
        )}
      </div>

      {/* Shapes */}
      <div
        className="relative"
        onMouseEnter={() => { cancelShapeLeave(); setShapeHover(true); }}
        onMouseLeave={() => { shapeLeaveTimer.current = setTimeout(() => setShapeHover(false), 120); }}
      >
        <button
          ref={shapeRef}
          title="Shapes"
          onClick={() => {
            const nowPinned = !shapePinned;
            setShapePinned(nowPinned);
            if (nowPinned) { setGifPinned(false); setGifHover(false); setDrawPinned(false); setDrawHover(false); onToolChange("shape"); onPopoverOpened?.(); }
          }}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
          style={{
            background: shapePinned ? "#000" : shapeHover ? "rgba(0,0,0,0.07)" : "transparent",
            color: shapePinned ? "#fff" : "#111",
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <rect x="2" y="13" width="9" height="9" rx="1.5" />
            <circle cx="17.5" cy="17.5" r="4.5" />
            <polygon points="12,2 22,11 2,11" />
          </svg>
        </button>

        {shapeOpen && (
          <div
            ref={popoverRef}
            className="absolute top-0 left-[calc(100%+10px)] flex gap-2 p-3 rounded-2xl shadow-xl"
            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", minWidth: 220 }}
          >
            {SHAPES.map((s) => (
              <button
                key={s.type}
                title={s.label}
                onClick={() => {
                  onAddShape(s.type);
                  setShapePinned(false);
                  setShapeHover(false);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-100 transition-colors flex-1 cursor-pointer"
                style={{ color }}
              >
                {s.icon}
                <span className="text-[10px] text-gray-500 leading-none">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GIF / Sticker picker */}
      <div
        className="relative"
        onMouseEnter={() => { cancelGifLeave(); setGifHover(true); }}
        onMouseLeave={() => { gifLeaveTimer.current = setTimeout(() => setGifHover(false), 120); }}
      >
        <button
          ref={gifRef}
          title="Add GIF or Sticker"
          onClick={() => {
            const nowPinned = !gifPinned;
            setGifPinned(nowPinned);
            if (nowPinned) { setShapePinned(false); setShapeHover(false); setDrawPinned(false); setDrawHover(false); onPopoverOpened?.(); }
          }}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
          style={{
            background: gifPinned ? "#000" : gifHover ? "rgba(0,0,0,0.07)" : "transparent",
            color: gifPinned ? "#fff" : "#111",
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <rect x="2" y="6" width="20" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/>
            <text x="5.5" y="15.5" fontSize="7.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">GIF</text>
          </svg>
        </button>

        {gifOpen && (
          <div
            ref={gifPopoverRef}
            className="absolute top-0 left-[calc(100%+10px)] p-3 rounded-2xl shadow-xl z-50"
            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", width: 420 }}
          >
            <GifPicker
              onSelect={(id, url) => {
                onAddGif(id, url);
                setGifPinned(false);
                setGifHover(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
