"use client";

import { MdRemove, MdAdd } from "react-icons/md";

interface ZoomNavProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset?: () => void;
}

export default function ZoomNav({ zoom, onZoomIn, onZoomOut, onZoomReset }: ZoomNavProps) {
  return (
    <div
      className="absolute bottom-6 right-6 flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl z-[200]"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <button
        onClick={onZoomOut}
        title="Zoom out"
        aria-label="Zoom out"
        disabled={zoom <= 0.25}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-black hover:bg-black/[0.06] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
      >
        <MdRemove size={16} />
      </button>
      <button
        onClick={onZoomReset}
        title="Reset zoom to 100%"
        aria-label="Reset zoom to 100%"
        className="text-xs font-semibold text-gray-500 w-11 text-center tabular-nums select-none leading-none hover:text-black transition-colors cursor-pointer rounded-lg py-1 hover:bg-black/[0.06]"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        title="Zoom in"
        aria-label="Zoom in"
        disabled={zoom >= 4}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-black hover:bg-black/[0.06] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
      >
        <MdAdd size={16} />
      </button>
    </div>
  );
}
