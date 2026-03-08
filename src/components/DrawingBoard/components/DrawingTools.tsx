"use client";

import { useEffect, useRef, useState } from "react";
import { IoTriangleSharp } from "react-icons/io5";
import {
  MdAutoFixOff,
  MdBrush,
  MdCircle,
  MdCreate,
  MdFavorite,
  MdNearMe,
  MdRectangle,
  MdStar,
  MdTextFields
} from "react-icons/md";
import type { ShapeType, Tool } from "../types";
import GifPicker from "./GifPicker";

import { PiGifFill } from "react-icons/pi";

const SHAPES: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
  {
    type: "rect",
    label: "Rectangle",
    icon: <MdRectangle className="w-5 h-5" />,
  },
  {
    type: "circle",
    label: "Circle",
    icon: <MdCircle className="w-5 h-5" />,
  },
  {
    type: "triangle",
    label: "Triangle",
    icon: <IoTriangleSharp className="w-5 h-5" />,
  },
  {
    type: "star",
    label: "Star",
    icon: <MdStar className="w-5 h-5" />,
  },
  {
    type: "heart",
    label: "Heart",
    icon: <MdFavorite className="w-5 h-5" />,
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
  const [shapeHover, setShapeHover] = useState(false);
  const [gifPinned, setGifPinned] = useState(false);
  const [gifHover, setGifHover] = useState(false);
  const [drawPinned, setDrawPinned] = useState(false);
  const [drawHover, setDrawHover] = useState(false);

  // Close all when a sibling component opens a popover
  useEffect(() => {
    if (!closeSignal) return;
    setShapePinned(false); setShapeHover(false);
    setGifPinned(false); setGifHover(false);
    setDrawPinned(false); setDrawHover(false);
  }, [closeSignal]);

  const shapeOpen = shapePinned || shapeHover;
  const gifOpen = gifPinned || gifHover;
  const drawOpen = drawPinned || drawHover;

  const shapeRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const gifRef = useRef<HTMLButtonElement>(null);
  const gifPopoverRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<HTMLButtonElement>(null);
  const drawPopoverRef = useRef<HTMLDivElement>(null);

  const shapeLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gifLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelShapeLeave = () => { if (shapeLeaveTimer.current) clearTimeout(shapeLeaveTimer.current); };
  const cancelGifLeave = () => { if (gifLeaveTimer.current) clearTimeout(gifLeaveTimer.current); };
  const cancelDrawLeave = () => { if (drawLeaveTimer.current) clearTimeout(drawLeaveTimer.current); };

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
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${active
          ? "bg-black text-white"
          : "text-[#111] hover:bg-black/[0.07] hover:scale-105"
        }`}
    >
      {icon}
    </button>
  );

  return (
    <div
      className="absolute top-5 left-5 flex flex-col gap-1 p-2 rounded-2xl z-[200]"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {/* Text */}
      {toolBtn(
        tool === "text",
        () => onAddText(),
        "Text",
        <MdTextFields className="w-5 h-5" aria-label="Text tool" />,
      )}

      {/* Separator */}
      <div className="h-px bg-black/[0.07] -mx-1 my-0.5" />

      {/* Draw popover: pencil, brush, select */}
      <div
        className="relative"
        onMouseEnter={() => { cancelDrawLeave(); setDrawHover(true); }}
        onMouseLeave={() => { drawLeaveTimer.current = setTimeout(() => setDrawHover(false), 120); }}
      >
        <button
          ref={drawRef}
          title="Draw"
          aria-label="Draw tools"
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
          {tool === "brush" && !drawOpen ? (
            <MdBrush className="w-5 h-5" />
          ) : tool === "eraser" && !drawOpen ? (
            <MdAutoFixOff className="w-5 h-5" />
          ) : (
            <MdCreate className="w-5 h-5" />
          )}
        </button>

        {drawOpen && (
          <div
            ref={drawPopoverRef}
            className="absolute top-0 left-[calc(100%+12px)] flex gap-2 p-3 rounded-2xl popover-enter-right"
            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.08)" }}
          >
            {/* Close button */}
            <button
              title="Close"
              onClick={() => { setDrawPinned(false); setDrawHover(false); onToolChange("select"); }}
              className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white text-gray-500 flex items-center justify-center text-xs leading-none cursor-pointer hover:text-black transition-colors z-10"
            >
              ✕
            </button>
            {/* Pencil */}
            <button
              title="Pencil"
              onClick={() => { onToolChange("pencil"); setDrawPinned(true); }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors flex-1 min-w-[52px] cursor-pointer ${tool === "pencil" ? "bg-black text-white" : "text-[#111] hover:bg-black/[0.07]"
                }`}
            >
              <MdCreate className="w-5 h-5" />
              <span className={`text-xs leading-none ${tool === "pencil" ? "text-white/70" : "text-gray-400"}`}>Pencil</span>
            </button>

            {/* Brush */}
            <button
              title="Brush"
              onClick={() => { onToolChange("brush"); setDrawPinned(true); }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors flex-1 min-w-[52px] cursor-pointer ${tool === "brush" ? "bg-black text-white" : "text-[#111] hover:bg-black/[0.07]"
                }`}
            >
              <MdBrush className="w-5 h-5" />
              <span className={`text-xs leading-none ${tool === "brush" ? "text-white/70" : "text-gray-400"}`}>Brush</span>
            </button>

            {/* Select */}
            <button
              title="Select"
              onClick={() => { onToolChange("select"); setDrawPinned(true); }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors flex-1 min-w-[52px] cursor-pointer ${tool === "select" ? "bg-black text-white" : "text-[#111] hover:bg-black/[0.07]"
                }`}
            >
              <MdNearMe className="w-5 h-5" />
              <span className={`text-xs leading-none ${tool === "select" ? "text-white/70" : "text-gray-400"}`}>Select</span>
            </button>

            {/* Eraser */}
            <button
              title="Eraser"
              onClick={() => { onToolChange("eraser"); setDrawPinned(true); }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors flex-1 min-w-[52px] cursor-pointer ${tool === "eraser" ? "bg-black text-white" : "text-[#111] hover:bg-black/[0.07]"
                }`}
            >
              <MdAutoFixOff className="w-5 h-5" />
              <span className={`text-xs leading-none ${tool === "eraser" ? "text-white/70" : "text-gray-400"}`}>Eraser</span>
            </button>

          </div>
        )}
      </div>

      {/* Separator */}
      <div className="h-px bg-black/[0.07] -mx-1 my-0.5" />

      {/* Shapes */}
      <div
        className="relative"
        onMouseEnter={() => { cancelShapeLeave(); setShapeHover(true); }}
        onMouseLeave={() => { shapeLeaveTimer.current = setTimeout(() => setShapeHover(false), 120); }}
      >
        <button
          ref={shapeRef}
          title="Shapes"
          aria-label="Shapes"
          onClick={() => {
            const nowPinned = !shapePinned;
            setShapePinned(nowPinned);
            if (nowPinned) { setGifPinned(false); setGifHover(false); setDrawPinned(false); setDrawHover(false); onToolChange("shape"); onPopoverOpened?.(); }
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${shapePinned
              ? "bg-black text-white"
              : shapeHover ? "bg-black/[0.07] text-[#111]" : "text-[#111] hover:bg-black/[0.07] hover:scale-105"
            }`}
        >
          <IoTriangleSharp className="w-5 h-5" />
        </button>

        {shapeOpen && (
          <div
            ref={popoverRef}
            className="absolute top-0 left-[calc(100%+12px)] flex gap-2 p-3 rounded-2xl popover-enter-right"
            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.08)", minWidth: 220 }}
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
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-black/[0.07] transition-colors flex-1 cursor-pointer text-[#1a1a1a]"
              >
                {s.icon}
                <span className="text-xs text-gray-400 leading-none">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="h-px bg-black/[0.07] -mx-1 my-0.5" />

      {/* GIF / Sticker picker */}
      <div
        className="relative"
        onMouseEnter={() => { cancelGifLeave(); setGifHover(true); }}
        onMouseLeave={() => { gifLeaveTimer.current = setTimeout(() => setGifHover(false), 120); }}
      >
        <button
          ref={gifRef}
          title="Add GIF or Sticker"
          aria-label="Add GIF or Sticker"
          onClick={() => {
            const nowPinned = !gifPinned;
            setGifPinned(nowPinned);
            if (nowPinned) { setShapePinned(false); setShapeHover(false); setDrawPinned(false); setDrawHover(false); onPopoverOpened?.(); }
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${gifPinned
              ? "bg-black text-white"
              : gifHover ? "bg-black/[0.07] text-[#111]" : "text-[#111] hover:bg-black/[0.07] hover:scale-105"
            }`}
        >
          <PiGifFill className="w-5 h-5" />
        </button>

        {gifOpen && (
          <div
            ref={gifPopoverRef}
            className="absolute top-0 left-[calc(100%+12px)] p-3 rounded-2xl z-50 popover-enter-right"
            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.08)", width: "min(420px, calc(100vw - 100px))" }}
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
