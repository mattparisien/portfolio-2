"use client";

interface ZoomNavProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function ZoomNav({ zoom, onZoomIn, onZoomOut }: ZoomNavProps) {
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
        disabled={zoom <= 0.25}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-base font-semibold text-gray-500 hover:text-black hover:bg-black/[0.06] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
      >
        −
      </button>
      <span className="text-xs font-semibold text-gray-500 w-11 text-center tabular-nums select-none leading-none">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        title="Zoom in"
        disabled={zoom >= 4}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-base font-semibold text-gray-500 hover:text-black hover:bg-black/[0.06] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
      >
        +
      </button>
    </div>
  );
}
