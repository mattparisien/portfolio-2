"use client";

import { useState } from "react";
import ColorButton from "./ColorButton";

interface ToolbarProps {
  color: string;
  opacity: number;
  strokeWeight: number;
  onColorChange: (c: string) => void;
  onOpacityChange: (v: number) => void;
  onStrokeWeightChange: (v: number) => void;
  /** When set, a second stroke color circle is shown (shapes only) */
  strokeColor?: string;
  onStrokeColorChange?: (c: string) => void;
}

export default function Toolbar({ color, opacity, strokeWeight, onColorChange, onOpacityChange, onStrokeWeightChange, strokeColor, onStrokeColorChange }: ToolbarProps) {
  const showDual = strokeColor !== undefined && onStrokeColorChange !== undefined;
  const [openPanel, setOpenPanel] = useState<"opacity" | "weight" | null>(null);
  const opacityOpen = openPanel === "opacity";
  const weightOpen  = openPanel === "weight";

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2.5 rounded-2xl shadow-xl z-[200]"
      style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(14px)" }}
    >
      {/* Color circle(s) */}
      {showDual ? (
        <>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors hover:bg-black/[0.07]">
              <ColorButton color={color} title="Fill colour" onChange={onColorChange} size={22} />
            </div>
            <span className="text-[8px] font-semibold uppercase tracking-widest text-gray-400 select-none leading-none">Fill</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors hover:bg-black/[0.07]">
              <ColorButton color={strokeColor!} title="Stroke colour" onChange={onStrokeColorChange!} size={22} />
            </div>
            <span className="text-[8px] font-semibold uppercase tracking-widest text-gray-400 select-none leading-none">Stroke</span>
          </div>
        </>
      ) : (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors hover:bg-black/[0.07]">
          <ColorButton color={color} title="Colour" onChange={onColorChange} size={22} />
        </div>
      )}

      {/* Stroke weight button + popover */}
      <div className="relative">
        <button
          onClick={() => setOpenPanel((v) => v === "weight" ? null : "weight")}
          className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-black/[0.07]"
          style={{ background: weightOpen ? "rgba(0,0,0,0.08)" : "transparent" }}
          title="Stroke weight"
        >
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
            <line x1="3" y1="6" x2="17" y2="6" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="3" y1="10" x2="17" y2="10" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="3" y1="14.5" x2="17" y2="14.5" stroke="#555" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </button>

        {weightOpen && (
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
                Weight
              </span>
              <span className="text-xs font-semibold text-gray-600 tabular-nums">
                {strokeWeight}px
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={60}
              value={strokeWeight}
              onChange={(e) => onStrokeWeightChange(Number(e.target.value))}
              className="w-full accent-black cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Opacity button + popover */}
      <div className="relative">
        <button
          onClick={() => setOpenPanel((v) => v === "opacity" ? null : "opacity")}
          className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-black/[0.07]"
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
