"use client";

import { useEffect, useRef, useState } from "react";
import { IoTriangleSharp } from "react-icons/io5";
import {
  MdAutoFixOff,
  MdBrush,
  MdCircle,
  MdCreate,
  MdFavorite,
  MdKeyboardArrowUp,
  MdNearMe,
  MdRectangle,
  MdStar,
  MdTextFields,
  MdUpload,
} from "react-icons/md";
import type { ShapeType, Tool } from "../types";
import GifPicker from "./GifPicker";
import { PiGifFill } from "react-icons/pi";

const SHAPES: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
  { type: "rect",     label: "Rectangle", icon: <MdRectangle className="w-5 h-5" /> },
  { type: "circle",   label: "Circle",    icon: <MdCircle className="w-5 h-5" /> },
  { type: "triangle", label: "Triangle",  icon: <IoTriangleSharp className="w-5 h-5" /> },
  { type: "star",     label: "Star",      icon: <MdStar className="w-5 h-5" /> },
  { type: "heart",    label: "Heart",     icon: <MdFavorite className="w-5 h-5" /> },
];

interface DrawingToolsProps {
  tool: Tool;
  color: string;
  onToolChange: (t: Tool) => void;
  onAddShape: (shape: ShapeType) => void;
  onAddText: () => void;
  onAddGif: (id: string, url: string) => void;
  onAddImage?: (url: string) => void;
  /** The shape type currently active in the parent (set by keyboard shortcut) */
  activeShapeType?: ShapeType;
  /** Incremented by the parent whenever another component opens a popover */
  closeSignal?: number;
  /** Incremented by the parent to programmatically trigger the upload dialog */
  uploadSignal?: number;
  /** Called when this component opens any of its own popovers */
  onPopoverOpened?: () => void;
}

export default function DrawingTools({
  tool, onToolChange, onAddShape, onAddText, onAddGif, onAddImage, closeSignal, uploadSignal, activeShapeType, onPopoverOpened,
}: DrawingToolsProps) {
  const [lastShape, setLastShape]   = useState<ShapeType>("rect");
  const [drawOpen, setDrawOpen]     = useState(false);
  const [shapeOpen, setShapeOpen]   = useState(false);
  const [gifOpen, setGifOpen]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const uploadFileRef = useRef<HTMLInputElement>(null);

  // Close all when a sibling component opens a popover
  useEffect(() => {
    if (!closeSignal) return;
    setDrawOpen(false);
    setShapeOpen(false);
    setGifOpen(false);
  }, [closeSignal]);

  // Open upload dialog when parent signals (e.g. keyboard shortcut)
  useEffect(() => {
    if (!uploadSignal) return;
    uploadFileRef.current?.click();
  }, [uploadSignal]);

  // Sync lastShape when parent activates a shape tool via keyboard shortcut
  useEffect(() => {
    if (tool === "shape" && activeShapeType) setLastShape(activeShapeType);
  }, [tool, activeShapeType]);

  const drawWrapRef    = useRef<HTMLDivElement>(null);
  const drawPopoverRef = useRef<HTMLDivElement>(null);
  const shapeWrapRef    = useRef<HTMLDivElement>(null);
  const shapePopoverRef = useRef<HTMLDivElement>(null);
  const gifWrapRef    = useRef<HTMLDivElement>(null);
  const gifPopoverRef = useRef<HTMLDivElement>(null);

  // Click-outside: draw popover
  useEffect(() => {
    if (!drawOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !drawWrapRef.current?.contains(e.target as Node) &&
        !drawPopoverRef.current?.contains(e.target as Node)
      ) setDrawOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [drawOpen]);

  // Click-outside: shape popover
  useEffect(() => {
    if (!shapeOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !shapeWrapRef.current?.contains(e.target as Node) &&
        !shapePopoverRef.current?.contains(e.target as Node)
      ) setShapeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [shapeOpen]);

  // Click-outside: gif popover
  useEffect(() => {
    if (!gifOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !gifWrapRef.current?.contains(e.target as Node) &&
        !gifPopoverRef.current?.contains(e.target as Node)
      ) setGifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [gifOpen]);

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

  const handleUploadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const toolBtn = (active: boolean, onClick: () => void, title: string, icon: React.ReactNode) => (
    <button
      title={title}
      onClick={onClick}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
        active ? "bg-accent text-white" : "text-[#111] hover:bg-black/[0.07]"
      }`}
    >
      {icon}
    </button>
  );

  // Chevron button appended to split buttons
  const Chevron = ({ open, onClick }: { open: boolean; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      title="More options"
      className={`w-6 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
        open ? "bg-black/[0.08] text-[#111]" : "text-[#aaa] hover:bg-black/[0.07] hover:text-[#111]"
      }`}
    >
      <MdKeyboardArrowUp
        className={`w-4 h-4 transition-transform duration-150 ${open ? "" : "rotate-180"}`}
      />
    </button>
  );

  const popoverStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(0,0,0,0.08)",
  };

  const isDrawActive = tool === "pencil" || tool === "brush" || tool === "eraser";
  const drawIcon = tool === "brush" && isDrawActive
    ? <MdBrush className="w-5 h-5" />
    : tool === "eraser" && isDrawActive
    ? <MdAutoFixOff className="w-5 h-5" />
    : <MdCreate className="w-5 h-5" />;

  const lastShapeIcon = SHAPES.find(s => s.type === lastShape)?.icon ?? <IoTriangleSharp className="w-5 h-5" />;

  const sep = <div className="w-px h-6 bg-black/[0.1] mx-0.5 self-center flex-shrink-0" />;

  return (
    <div
      className="drawing-ui-overlay fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 p-2 rounded-2xl z-[200]"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      {/* Select */}
      {toolBtn(
        tool === "select",
        () => onToolChange("select"),
        "Select",
        <MdNearMe className="w-5 h-5 -scale-x-100" />,
      )}

      {sep}

      {/* Text */}
      {toolBtn(
        tool === "text",
        () => onAddText(),
        "Text",
        <MdTextFields className="w-5 h-5" />,
      )}

      {sep}

      {/* Draw: primary = activate current draw tool (default pencil), chevron = brush / eraser picker */}
      <div ref={drawWrapRef} className="relative flex items-center">
        <button
          title={tool === "brush" ? "Brush" : tool === "eraser" ? "Eraser" : "Pencil"}
          onClick={() => {
            if (!isDrawActive) onToolChange("pencil");
            setDrawOpen(false);
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
            isDrawActive ? "bg-accent text-white" : "text-[#111] hover:bg-black/[0.07]"
          }`}
        >
          {drawIcon}
        </button>
        <Chevron
          open={drawOpen}
          active={isDrawActive}
          onClick={() => {
            const next = !drawOpen;
            setDrawOpen(next);
            if (next) { setShapeOpen(false); setGifOpen(false); onPopoverOpened?.(); }
          }}
        />

        {drawOpen && (
          <div
            ref={drawPopoverRef}
            className="fixed right-5 bottom-24 flex gap-2 p-3 rounded-2xl popover-enter-up z-[300]"
            style={popoverStyle}
          >
            {(
              [
                { t: "pencil" as Tool, icon: <MdCreate className="w-5 h-5" />,     label: "Pencil" },
                { t: "brush"  as Tool, icon: <MdBrush className="w-5 h-5" />,      label: "Brush"  },
                { t: "eraser" as Tool, icon: <MdAutoFixOff className="w-5 h-5" />, label: "Eraser" },
              ] as const
            ).map(({ t, icon, label }) => (
              <button
                key={t}
                title={label}
                onClick={() => { onToolChange(t); setDrawOpen(false); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors flex-1 min-w-[52px] cursor-pointer ${
                  tool === t ? "bg-accent text-white" : "text-[#111] hover:bg-black/[0.07]"
                }`}
              >
                {icon}
                <span className={`text-xs leading-none ${tool === t ? "text-white/70" : "text-gray-400"}`}>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {sep}

      {/* Shapes: primary = activate shape draw mode, chevron = shape picker */}
      <div ref={shapeWrapRef} className="relative flex items-center">
        <button
          title={`Draw ${lastShape}`}
          onClick={() => onAddShape(lastShape)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
            tool === "shape" ? "bg-accent text-white" : "text-[#111] hover:bg-black/[0.07]"
          }`}
        >
          {lastShapeIcon}
        </button>
        <Chevron
          open={shapeOpen}
          active={tool === "shape"}
          onClick={() => {
            const next = !shapeOpen;
            setShapeOpen(next);
            if (next) { setDrawOpen(false); setGifOpen(false); onPopoverOpened?.(); }
          }}
        />

        {shapeOpen && (
          <div
            ref={shapePopoverRef}
            className="fixed right-5 bottom-24 flex gap-2 p-3 rounded-2xl popover-enter-up z-[300]"
            style={{ ...popoverStyle, minWidth: 220 }}
          >
            {SHAPES.map((s) => (
              <button
                key={s.type}
                title={s.label}
                onClick={() => {
                  setLastShape(s.type);
                  onAddShape(s.type);
                  setShapeOpen(false);
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

      {sep}

      {/* GIF / Sticker picker */}
      <div ref={gifWrapRef} className="relative">
        <button
          title="Add GIF or Sticker"
          onClick={() => {
            const next = !gifOpen;
            setGifOpen(next);
            if (next) { setDrawOpen(false); setShapeOpen(false); onPopoverOpened?.(); }
          }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
            gifOpen ? "bg-black/[0.07] text-[#111]" : "text-[#111] hover:bg-black/[0.07]"
          }`}
        >
          <PiGifFill className="w-5 h-5" />
        </button>

        {gifOpen && (
          <div
            ref={gifPopoverRef}
            className="fixed right-5 bottom-24 p-3 rounded-2xl z-[300] popover-enter-up"
            style={{ ...popoverStyle, width: "min(420px, calc(100vw - 100px))" }}
          >
            <GifPicker
              onSelect={(id, url) => {
                onAddGif(id, url);
                setGifOpen(false);
              }}
            />
          </div>
        )}
      </div>

      {sep}

      {/* Upload image — opens file dialog directly */}
      <button
        title="Upload image"
        disabled={uploading}
        onClick={() => uploadFileRef.current?.click()}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[#111] hover:bg-black/[0.07]"
      >
        {uploading ? (
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <MdUpload className="w-5 h-5" />
        )}
      </button>
      <input
        ref={uploadFileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleUploadFileChange}
      />
    </div>
  );
}
