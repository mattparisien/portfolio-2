"use client";

import { useEffect, useRef, useState } from "react";
import { IoTriangleSharp } from "react-icons/io5";
import {
  MdAutoFixOff,
  MdBrush,
  MdCircle,
  MdCreate,
  MdDeleteSweep,
  MdFavorite,
  MdHorizontalRule,
  MdKeyboardArrowUp,
  MdNearMe,
  MdRectangle,
  MdRedo,
  MdStar,
  MdTextFields,
  MdUndo,
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
  onUndo?: () => void;
  onRedo?: () => void;
  onClearRequest?: () => void;
}

// Chevron button appended to split buttons — defined outside to prevent remounting on every render
const Chevron = ({ open, onClick, ariaLabel, ariaExpanded }: { open: boolean; active: boolean; onClick: () => void; ariaLabel?: string; ariaExpanded?: boolean }) => (
  <button
    onClick={onClick}
    title="More options"
    aria-label={ariaLabel}
    aria-expanded={ariaExpanded}
    className={`w-6 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
      open ? "bg-black/[0.08] text-[#111]" : "text-[#aaa] hover:bg-black/[0.07] hover:text-[#111]"
    }`}
  >
    <MdKeyboardArrowUp
      className={`w-4 h-4 transition-transform duration-150 ${open ? "" : "rotate-180"}`}
    />
  </button>
);

export default function DrawingTools({
  tool, onToolChange, onAddShape, onAddText, onAddGif, onAddImage, closeSignal, uploadSignal, activeShapeType, onPopoverOpened, onUndo, onRedo, onClearRequest,
}: DrawingToolsProps) {
  const [lastShape, setLastShape]   = useState<ShapeType>("rect");
  const [drawOpen, setDrawOpen]     = useState(false);
  const [shapeOpen, setShapeOpen]   = useState(false);
  const [gifOpen, setGifOpen]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [gifPopoverStyle, setGifPopoverStyle] = useState<React.CSSProperties>({});
  const uploadFileRef  = useRef<HTMLInputElement>(null);
  const gifButtonRef   = useRef<HTMLButtonElement>(null);

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
      aria-label={title}
      onClick={onClick}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
        active ? "bg-accent text-white" : "text-[#111] hover:bg-black/[0.07]"
      }`}
    >
      {icon}
    </button>
  );

  const popoverStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(0,0,0,0.08)",
  };

  const isDrawActive = tool === "pencil" || tool === "brush" || tool === "line" || tool === "eraser";
  const drawIcon = tool === "brush" && isDrawActive
    ? <MdBrush className="w-5 h-5" />
    : tool === "eraser" && isDrawActive
    ? <MdAutoFixOff className="w-5 h-5" />
    : tool === "line" && isDrawActive
    ? <MdHorizontalRule className="w-5 h-5" />
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
          title={tool === "brush" ? "Brush" : tool === "eraser" ? "Eraser" : tool === "line" ? "Line" : "Pencil"}
          aria-label={tool === "brush" ? "Brush" : tool === "eraser" ? "Eraser" : tool === "line" ? "Line" : "Pencil"}
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
          ariaLabel="Drawing tools"
          ariaExpanded={drawOpen}
          onClick={() => {
            const next = !drawOpen;
            setDrawOpen(next);
            if (next) { setShapeOpen(false); setGifOpen(false); onPopoverOpened?.(); }
          }}
        />

        {drawOpen && (
          <div
            ref={drawPopoverRef}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-2 p-3 rounded-2xl popover-enter-up z-[300]"
            style={popoverStyle}
          >
            {(
              [
                { t: "pencil" as Tool, icon: <MdCreate className="w-5 h-5" />,       label: "Pencil" },
                { t: "line"   as Tool, icon: <MdHorizontalRule className="w-5 h-5" />, label: "Line"   },
                { t: "brush"  as Tool, icon: <MdBrush className="w-5 h-5" />,         label: "Brush"  },
                { t: "eraser" as Tool, icon: <MdAutoFixOff className="w-5 h-5" />,    label: "Eraser" },
              ] as const
            ).map(({ t, icon, label }) => (
              <button
                key={t}
                title={label}
                aria-label={label}
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
          aria-label={`Draw ${lastShape}`}
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
          ariaLabel="Shape options"
          ariaExpanded={shapeOpen}
          onClick={() => {
            const next = !shapeOpen;
            setShapeOpen(next);
            if (next) { setDrawOpen(false); setGifOpen(false); onPopoverOpened?.(); }
          }}
        />

        {shapeOpen && (
          <div
            ref={shapePopoverRef}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-2 p-3 rounded-2xl popover-enter-up z-[300]"
            style={{ ...popoverStyle, minWidth: 220 }}
          >
            {SHAPES.map((s) => (
              <button
                key={s.type}
                title={s.label}
                aria-label={s.label}
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
          ref={gifButtonRef}
          title="Add GIF or Sticker"
          aria-label="Insert GIF"
          aria-expanded={gifOpen}
          onClick={() => {
            const next = !gifOpen;
            setGifOpen(next);
            if (next) {
              setDrawOpen(false);
              setShapeOpen(false);
              onPopoverOpened?.();
              // Compute viewport-safe position for the popover
              if (gifButtonRef.current) {
                const rect = gifButtonRef.current.getBoundingClientRect();
                const POPOVER_W = Math.min(420, window.innerWidth - 16);
                let leftPx = rect.left + rect.width / 2 - POPOVER_W / 2;
                leftPx = Math.max(8, Math.min(leftPx, window.innerWidth - POPOVER_W - 8));
                const bottomPx = window.innerHeight - rect.top + 8;
                setGifPopoverStyle({ position: "fixed", left: leftPx, bottom: bottomPx, width: POPOVER_W });
              }
            }
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
            className="p-3 rounded-2xl z-[300] popover-enter-up"
            style={{ ...popoverStyle, ...gifPopoverStyle }}
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
        aria-label="Upload image"
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

      {sep}

      {/* Undo */}
      <button
        title="Undo (⌘Z)"
        aria-label="Undo"
        onClick={onUndo}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-[#111] hover:bg-black/[0.07]"
      >
        <MdUndo className="w-5 h-5" />
      </button>

      {/* Redo */}
      <button
        title="Redo (⌘⇧Z)"
        aria-label="Redo"
        onClick={onRedo}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-[#111] hover:bg-black/[0.07]"
      >
        <MdRedo className="w-5 h-5" />
      </button>

      {sep}

      {/* Clear canvas */}
      <button
        title="Clear canvas"
        aria-label="Clear canvas"
        onClick={onClearRequest}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-[#111] hover:bg-red-50 hover:text-red-500"
      >
        <MdDeleteSweep className="w-5 h-5" />
      </button>
    </div>
  );
}
