"use client";

import { useState, useRef, useEffect } from "react";
import type { Tool, ShapeType } from "../types";
import { COLORS } from "../constants";

const SHAPES: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
  {
    type: "rect",
    label: "Rectangle",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <rect x="2" y="6" width="20" height="13" rx="2" />
      </svg>
    ),
  },
  {
    type: "circle",
    label: "Circle",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    type: "triangle",
    label: "Triangle",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <polygon points="12,3 22,21 2,21" />
      </svg>
    ),
  },
  {
    type: "star",
    label: "Star",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    ),
  },
  {
    type: "heart",
    label: "Heart",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 21C12 21 3 14 3 8.5A5.5 5.5 0 0 1 12 5.1 5.5 5.5 0 0 1 21 8.5C21 14 12 21 12 21Z" />
      </svg>
    ),
  },
];

interface ToolbarProps {
  tool: Tool;
  color: string;
  brushSize: number;
  zoom: number;
  onToolChange: (t: Tool) => void;
  onColorChange: (c: string) => void;
  onBrushSizeChange: (s: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onClear: () => void;
  onAddShape: (shape: ShapeType) => void;
  onRecolorSelected: (c: string) => void;
}

export default function Toolbar({
  tool,
  color,
  brushSize,
  zoom,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onZoomIn,
  onZoomOut,
  onClear,
  onAddShape,
  onRecolorSelected,
}: ToolbarProps) {
  const [shapePopoverOpen, setShapePopoverOpen] = useState(false);
  const shapeButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!shapePopoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !shapeButtonRef.current?.contains(e.target as Node) &&
        !popoverRef.current?.contains(e.target as Node)
      ) {
        setShapePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [shapePopoverOpen]);

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}
    >
      {/* Tool toggle */}
      <div className="flex gap-1 border-r border-gray-200 pr-3">
        {/* Select */}
        <button
          title="Select"
          onClick={() => onToolChange("select")}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: tool === "select" ? "#000" : "transparent",
            color: tool === "select" ? "#fff" : "#000",
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M4 2 L4 18 L8.5 13.5 L11.5 20 L13.5 19 L10.5 12.5 L16 12.5 Z" />
          </svg>
        </button>

        {(["pencil", "eraser", "text"] as Tool[]).map((t) => (
          <button
            key={t}
            title={t}
            onClick={() => onToolChange(t)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all"
            style={{
              background: tool === t ? "#000" : "transparent",
              color: tool === t ? "#fff" : "#000",
            }}
          >
            {t === "pencil" ? "✏️" : t === "eraser" ? "🧹" : "T"}
          </button>
        ))}

        {/* Shape tool button */}
        <div className="relative">
          <button
            ref={shapeButtonRef}
            title="Shapes"
            onClick={() => setShapePopoverOpen((o) => !o)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all"
            style={{
              background: tool === "shape" ? "#000" : shapePopoverOpen ? "#f0f0f0" : "transparent",
              color: tool === "shape" ? "#fff" : "#000",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <rect x="2" y="13" width="9" height="9" rx="1.5" />
              <circle cx="17.5" cy="17.5" r="4.5" />
              <polygon points="12,2 22,11 2,11" />
            </svg>
          </button>

          {/* Shape popover */}
          {shapePopoverOpen && (
            <div
              ref={popoverRef}
              className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 flex gap-2 p-3 rounded-2xl shadow-xl"
              style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", minWidth: 220 }}
            >
              {SHAPES.map((s) => (
                <button
                  key={s.type}
                  title={s.label}
                  onClick={() => {
                    onAddShape(s.type);
                    setShapePopoverOpen(false);
                  }}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-100 transition-colors flex-1"
                  style={{ color }}
                >
                  {s.icon}
                  <span className="text-[10px] text-gray-500 leading-none">{s.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Color swatches */}
      <div className="flex gap-1.5 border-r border-gray-200 pr-3">
        {COLORS.map((c) => (
          <button
            key={c}
            title={c}
            onClick={() => {
              onColorChange(c);
              onRecolorSelected(c);
              if (tool !== "shape") onToolChange("pencil");
            }}
            className="w-6 h-6 rounded-full transition-transform hover:scale-110"
            style={{
              background: c,
              border:
                color === c && (tool === "pencil" || tool === "shape")
                  ? "2px solid #333"
                  : "1.5px solid #ccc",
              transform:
                color === c && (tool === "pencil" || tool === "shape") ? "scale(1.25)" : undefined,
            }}
          />
        ))}
      </div>

      {/* Brush size slider */}
      <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
        <span
          className="rounded-full block flex-shrink-0"
          style={{
            width: Math.min(Math.max(brushSize, 4), 24),
            height: Math.min(Math.max(brushSize, 4), 24),
            background: "#333",
          }}
        />
        <input
          type="range"
          min={1}
          max={60}
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          className="w-24 accent-black cursor-pointer"
          title={`${brushSize}px`}
        />
        <span className="text-xs text-gray-500 w-6 text-right">{brushSize}</span>
      </div>

      {/* Clear */}
      <button
        onClick={onClear}
        title="Clear canvas"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg hover:bg-red-50 transition-colors border-r border-gray-200 pr-3 mr-0"
      >
        🗑️
      </button>

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onZoomOut}
          title="Zoom out"
          disabled={zoom <= 0.25}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold transition-colors hover:bg-gray-100 disabled:opacity-30"
        >
          −
        </button>
        <span className="text-xs text-gray-600 w-10 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          title="Zoom in"
          disabled={zoom >= 4}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-base font-bold transition-colors hover:bg-gray-100 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}

