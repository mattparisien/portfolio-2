"use client";

import type { Tool } from "../types";
import { COLORS, BRUSH_SIZES } from "../constants";

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

      {/* Brush sizes */}
      <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
        {BRUSH_SIZES.map((s) => (
          <button
            key={s}
            title={`${s}px`}
            onClick={() => onBrushSizeChange(s)}
            className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
            style={{ background: brushSize === s ? "#000" : "transparent" }}
          >
            <span
              className="rounded-full block"
              style={{
                width: Math.min(s, 24),
                height: Math.min(s, 24),
                background: brushSize === s ? "#fff" : "#333",
              }}
            />
          </button>
        ))}
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
