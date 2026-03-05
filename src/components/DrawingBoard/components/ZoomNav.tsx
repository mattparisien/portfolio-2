"use client";

interface ZoomNavProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export default function ZoomNav({ zoom, onZoomIn, onZoomOut }: ZoomNavProps) {
  return (
    <div className="absolute bottom-6 right-6 flex items-center gap-1 z-[200]">
      <button
        onClick={onZoomOut}
        title="Zoom out"
        disabled={zoom <= 0.25}
        className="w-7 h-7 flex items-center justify-center text-base font-bold text-gray-500 hover:text-black transition-colors disabled:opacity-30 cursor-pointer"
      >
        −
      </button>
      <span className="text-xs text-gray-500 w-10 text-center tabular-nums select-none">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={onZoomIn}
        title="Zoom in"
        disabled={zoom >= 4}
        className="w-7 h-7 flex items-center justify-center text-base font-bold text-gray-500 hover:text-black transition-colors disabled:opacity-30 cursor-pointer"
      >
        +
      </button>
    </div>
  );
}
