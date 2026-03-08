"use client";

interface ZoomNavProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset?: () => void;
  onUndo?: () => void;
}

export default function ZoomNav({ zoom, onZoomIn, onZoomOut, onZoomReset, onUndo }: ZoomNavProps) {
  return (
    <div
      className="absolute bottom-6 right-6 flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl z-[200]"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {/* Undo */}
      {onUndo && (
        <>
          <button
            onClick={onUndo}
            title="Undo (⌘Z)"
            aria-label="Undo"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-black hover:bg-black/[0.06] transition-all cursor-pointer select-none"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
              <path d="M5.5 2.5A.75.75 0 0 1 5.5 1h-4a.5.5 0 0 0-.5.5v4a.75.75 0 0 1 1.5 0V3.56A7 7 0 1 1 1 9a.75.75 0 0 1 1.5 0 5.5 5.5 0 1 0 3.5-5.19V5.5a.75.75 0 0 1-.5.71V2.5z"/>
            </svg>
          </button>
          <div className="w-px h-4 bg-black/[0.08] mx-0.5 flex-shrink-0" />
        </>
      )}

      <button
        onClick={onZoomOut}
        title="Zoom out"
        aria-label="Zoom out"
        disabled={zoom <= 0.25}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-base font-semibold text-gray-500 hover:text-black hover:bg-black/[0.06] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
      >
        −
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
        className="w-7 h-7 flex items-center justify-center rounded-lg text-base font-semibold text-gray-500 hover:text-black hover:bg-black/[0.06] transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer select-none"
      >
        +
      </button>
    </div>
  );
}
