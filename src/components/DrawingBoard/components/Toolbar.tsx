"use client";

import { useState } from "react";
import ColorButton from "./ColorButton";

interface ToolbarProps {
  color: string;
  opacity: number;
  onColorChange: (c: string) => void;
  onOpacityChange: (v: number) => void;
}

export default function Toolbar({ color, opacity, onColorChange, onOpacityChange }: ToolbarProps) {
  const [opacityOpen, setOpacityOpen] = useState(false);

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2.5 rounded-2xl shadow-xl z-[200]"
      style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(14px)" }}
    >
      {/* Shared color circle */}
      <ColorButton color={color} title="Stroke colour" onChange={onColorChange} size={28} />

      {/* Opacity button + popover */}
      <div className="relative">
        <button
          onClick={() => setOpacityOpen((v) => !v)}
          className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
          style={{ background: opacityOpen ? "rgba(0,0,0,0.08)" : "transparent" }}
          title="Transparency"
        >
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
            <circle cx="10" cy="10" r="7.5" stroke="#555" strokeWidth="1.5" />
            <path d="M10 2.5 a7.5 7.5 0 0 1 0 15" fill="#555" />
          </svg>
        </button>

        {opacityOpen && (
          <div
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(14px)",
              width: 168,
              border: "1px solid rgba(0,0,0,0.07)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 select-none">
                Opacity
              </span>
              <span className="text-xs font-semibold text-gray-600 tabular-nums">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(opacity * 100)}
              onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
              className="w-full accent-black cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}
