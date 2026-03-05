"use client";

import type { Tool } from "../types";
import { COLORS } from "../constants";

interface ToolbarProps {
  tool: Tool;
  color: string;
  brushSize: number;
  zoom: number;
  onColorChange: (c: string) => void;
  onBrushSizeChange: (s: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onClear: () => void;
  onRecolorSelected: (c: string) => void;
}

export default function Toolbar({
  tool,
  color,
  brushSize,
  zoom,
  onColorChange,
  onBrushSizeChange,
  onZoomIn,
  onZoomOut,
  onClear,
  onRecolorSelected,
}: ToolbarProps) {
  const isDrawing = tool === "pencil" || tool === "brush";

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}
    >
      {/* Color swatches */}
      <div className="flex flex-col gap-1.5 border-r border-gray-200 pr-3">
        {isDrawing && (
          <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 text-center select-none">Stroke</span>
        )}
        <div className="flex gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            title={c}
            onClick={() => {
              onColorChange(c);
              if (!isDrawing) onRecolorSelected(c);
            }}
            className="w-6 h-6 rounded-full transition-transform hover:scale-110"
            style={{
              background: c,
              border: color === c ? "2px solid #333" : "1.5px solid #ccc",
              transform: color === c ? "scale(1.25)" : undefined,
            }}
          />
        ))}
        </div>
      </div>

      {/* Brush size slider */}
      <div className="flex flex-col gap-1 border-r border-gray-200 pr-3">
        {isDrawing && (
          <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 text-center select-none">Weight</span>
        )}
        <div className="flex items-center gap-2">
          <span
            className="rounded-full block flex-shrink-0"
            style={{
              width: Math.min(Math.max(brushSize, 4), 24),
              height: Math.min(Math.max(brushSize, 4), 24),
              background: color,
              border: "1px solid rgba(0,0,0,0.15)",
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

