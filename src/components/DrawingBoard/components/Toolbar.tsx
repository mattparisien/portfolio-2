"use client";

import { useState, useEffect } from "react";
import type { Canvas } from "fabric";
import ColorPopover from "./ColorPopover";

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
  /** Optional canvas ref — enables "used in document" colors inside ColorPopover */
  fabricRef?: React.MutableRefObject<Canvas | null>;
  closeSignal?: number;
  onPopoverOpened?: () => void;
}

export default function Toolbar({ color, opacity, strokeWeight, onColorChange, onOpacityChange, onStrokeWeightChange, strokeColor, onStrokeColorChange, fabricRef, closeSignal, onPopoverOpened }: ToolbarProps) {
  const showDual = strokeColor !== undefined && onStrokeColorChange !== undefined;
  const [openPanel, setOpenPanel] = useState<"opacity" | "weight" | null>(null);
  const [openColor, setOpenColor] = useState<"fill" | "stroke" | null>(null);
  const opacityOpen = openPanel === "opacity";
  const weightOpen  = openPanel === "weight";

  // Close all when a sibling component opens a popover
  useEffect(() => {
    if (!closeSignal) return;
    setOpenPanel(null);
    setOpenColor(null);
  }, [closeSignal]);

  function openFill() {
    setOpenColor("fill");
    setOpenPanel(null);
    onPopoverOpened?.();
  }
  function openStroke() {
    setOpenColor("stroke");
    setOpenPanel(null);
    onPopoverOpened?.();
  }

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2.5 rounded-2xl z-[200]"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(14px)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      {/* Color swatch button(s) — open ColorPopover */}
      {showDual ? (
        <>
          <div className="flex flex-col items-center gap-0.5">
            <button
              title="Fill colour"
              onClick={(e) => { e.stopPropagation(); if (openColor === "fill") setOpenColor(null); else openFill(); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors hover:bg-black/[0.07]"
              style={{ background: openColor === "fill" ? "rgba(0,0,0,0.08)" : "transparent" }}
            >
              <span
                className="block rounded-full flex-shrink-0"
                style={{ width: 22, height: 22, background: color, boxShadow: "0 0 0 1.5px rgba(0,0,0,0.15), 0 0 0 3px #fff, 0 0 0 4.5px rgba(0,0,0,0.12)" }}
              />
            </button>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 select-none leading-none">Fill</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <button
              title="Stroke colour"
              onClick={(e) => { e.stopPropagation(); if (openColor === "stroke") setOpenColor(null); else openStroke(); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors hover:bg-black/[0.07]"
              style={{ background: openColor === "stroke" ? "rgba(0,0,0,0.08)" : "transparent" }}
            >
              <span
                className="block rounded-full flex-shrink-0"
                style={{ width: 22, height: 22, background: strokeColor, boxShadow: "0 0 0 1.5px rgba(0,0,0,0.15), 0 0 0 3px #fff, 0 0 0 4.5px rgba(0,0,0,0.12)" }}
              />
            </button>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 select-none leading-none">Stroke</span>
          </div>
        </>
      ) : (
        <button
          title="Colour"
          onClick={(e) => { e.stopPropagation(); if (openColor === "fill") setOpenColor(null); else openFill(); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors hover:bg-black/[0.07]"
          style={{ background: openColor === "fill" ? "rgba(0,0,0,0.08)" : "transparent" }}
        >
          <span
            className="block rounded-full flex-shrink-0"
            style={{ width: 22, height: 22, background: color, boxShadow: "0 0 0 1.5px rgba(0,0,0,0.15), 0 0 0 3px #fff, 0 0 0 4.5px rgba(0,0,0,0.12)" }}
          />
        </button>
      )}

      {/* ColorPopover portal instances — positioned above the bottom toolbar */}
      {openColor === "fill" && (
        <ColorPopover
          color={color}
          fabricRef={fabricRef}
          onColorChange={onColorChange}
          onClose={() => setOpenColor(null)}
          anchorStyle={{ top: "auto", bottom: 88, left: "calc(50vw - 128px)" }}
        />
      )}
      {openColor === "stroke" && showDual && (
        <ColorPopover
          color={strokeColor!}
          fabricRef={fabricRef}
          onColorChange={onStrokeColorChange!}
          onClose={() => setOpenColor(null)}
          anchorStyle={{ top: "auto", bottom: 88, left: "calc(50vw - 128px)" }}
        />
      )}

      {/* Thin separator */}
      <div className="w-px h-5 bg-black/[0.10] mx-0.5 flex-shrink-0" />

      {/* Stroke weight button + popover */}
      <div className="relative">
        <button
          onClick={() => { setOpenPanel((v) => { const next = v === "weight" ? null : "weight"; if (next) onPopoverOpened?.(); return next; }); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-black/[0.07]"
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
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-2xl popover-enter"
            style={{
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(14px)",
              width: 180,
              border: "1px solid rgba(0,0,0,0.07)",
            }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
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
          onClick={() => { setOpenPanel((v) => { const next = v === "opacity" ? null : "opacity"; if (next) onPopoverOpened?.(); return next; }); }}
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-black/[0.07]"
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
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-2xl popover-enter"
            style={{
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(14px)",
              width: 180,
              border: "1px solid rgba(0,0,0,0.07)",
            }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
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
