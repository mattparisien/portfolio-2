"use client";

import type { Tool } from "../types";
import { COLORS } from "../constants";

interface ToolbarProps {
  tool: Tool;
  color: string;
  brushSize: number;
  onToolChange: (t: Tool) => void;
  onColorChange: (c: string) => void;
  onBrushSizeChange: (s: number) => void;
  onClear: () => void;
}

export default function Toolbar({
  tool,
  color,
  brushSize,
  onToolChange,
  onColorChange,
  onBrushSizeChange,
  onClear,
}: ToolbarProps) {
  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}
    >
      {/* Tool toggle */}
      <div className="flex gap-1 border-r border-gray-200 pr-3">
        {(["pencil", "eraser"] as Tool[]).map((t) => (
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
            {t === "pencil" ? "✏️" : "🧹"}
          </button>
        ))}
      </div>

      {/* Color swatches */}
      <div className="flex gap-1.5 border-r border-gray-200 pr-3">
        {COLORS.map((c) => (
          <button
            key={c}
            title={c}
            onClick={() => {
              onColorChange(c);
              onToolChange("pencil");
            }}
            className="w-6 h-6 rounded-full transition-transform hover:scale-110"
            style={{
              background: c,
              border:
                color === c && tool === "pencil"
                  ? "2px solid #333"
                  : "1.5px solid #ccc",
              transform:
                color === c && tool === "pencil" ? "scale(1.25)" : undefined,
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
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg hover:bg-red-50 transition-colors"
      >
        🗑️
      </button>
    </div>
  );
}
