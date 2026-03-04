"use client";

import { useState, useRef, useEffect } from "react";
import type { Tool } from "../types";
import { COLORS } from "../constants";
import GifPicker from "./GifPicker";

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
  onRecolorSelected: (c: string) => void;
  onAddGif: (id: string, url: string) => void;
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
  onRecolorSelected,
  onAddGif,
}: ToolbarProps) {
  const [gifPopoverOpen, setGifPopoverOpen] = useState(false);
  const gifButtonRef = useRef<HTMLButtonElement>(null);
  const gifPopoverRef = useRef<HTMLDivElement>(null);

  // Close GIF popover on outside click
  useEffect(() => {
    if (!gifPopoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !gifButtonRef.current?.contains(e.target as Node) &&
        !gifPopoverRef.current?.contains(e.target as Node)
      ) {
        setGifPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [gifPopoverOpen]);

  // Prevent canvas wheel/touch handlers (registered on window) from stealing
  // scroll events while the GIF popover is open.
  useEffect(() => {
    const el = gifPopoverRef.current;
    if (!el || !gifPopoverOpen) return;
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener("wheel", stop, { passive: false });
    el.addEventListener("touchstart", stop, { passive: false });
    el.addEventListener("touchmove", stop, { passive: false });
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("touchmove", stop);
    };
  }, [gifPopoverOpen]);

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}
    >
      {/* Select + Eraser */}
      <div className="flex gap-1 border-r border-gray-200 pr-3">
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
        <button
          title="Eraser"
          onClick={() => onToolChange("eraser")}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all"
          style={{
            background: tool === "eraser" ? "#000" : "transparent",
            color: tool === "eraser" ? "#fff" : "#000",
          }}
        >
          🧹
        </button>
      </div>

      {/* GIF button */}
      <div className="relative border-r border-gray-200 pr-3">
        <button
          ref={gifButtonRef}
          title="Add GIF"
          onClick={() => setGifPopoverOpen((o) => !o)}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all"
          style={{
            background: gifPopoverOpen ? "#000" : "transparent",
            color: gifPopoverOpen ? "#fff" : "#000",
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <rect x="2" y="6" width="20" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/>
            <text x="5.5" y="15.5" fontSize="7.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">GIF</text>
          </svg>
        </button>

        {gifPopoverOpen && (
          <div
            ref={gifPopoverRef}
            className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 p-3 rounded-2xl shadow-xl z-50"
            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", width: 420 }}
          >
            <GifPicker
              onSelect={(id, url) => {
                onAddGif(id, url);
                setGifPopoverOpen(false);
              }}
            />
          </div>
        )}
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

