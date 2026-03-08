"use client";

import { useState, useEffect } from "react";

interface ToolbarProps {
  color: string;
  opacity: number;
  strokeWeight: number;
  onOpacityChange: (v: number) => void;
  onStrokeWeightChange: (v: number) => void;
  /** When set, a second stroke color circle is shown (shapes only) */
  strokeColor?: string;
  onStrokeColorChange?: (c: string) => void;
  closeSignal?: number;
  onPopoverOpened?: () => void;
  /** Shared color popover control — managed by the parent (DrawingBoard) */
  colorPopoverOpenFor?: "fill" | "stroke" | null;
  onOpenFillColorPopover?: () => void;
  onOpenStrokeColorPopover?: () => void;
  onCloseColorPopover?: () => void;
}

/** Small labelled toolbar button with icon + label beneath */
function ToolbarBtn({
  active,
  title,
  label,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  label: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-[3px]">
      <button
        title={title}
        onClick={onClick}
        className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105"
        style={{
          background: active ? "rgba(0,0,0,0.09)" : "transparent",
        }}
      >
        {children}
      </button>
      <span className="text-xs font-medium tracking-wide text-gray-400 select-none leading-none">
        {label}
      </span>
    </div>
  );
}

export default function Toolbar({ color, opacity, strokeWeight, onOpacityChange, onStrokeWeightChange, strokeColor, onStrokeColorChange, closeSignal, onPopoverOpened, colorPopoverOpenFor, onOpenFillColorPopover, onOpenStrokeColorPopover, onCloseColorPopover }: ToolbarProps) {
  const showDual = strokeColor !== undefined && onStrokeColorChange !== undefined;
  const [openPanel, setOpenPanel] = useState<"opacity" | "weight" | null>(null);
  const opacityOpen = openPanel === "opacity";
  const weightOpen  = openPanel === "weight";

  // Close all when a sibling component opens a popover
  useEffect(() => {
    if (!closeSignal) return;
    setOpenPanel(null);
  }, [closeSignal]);

  function openFill() {
    setOpenPanel(null);
    if (colorPopoverOpenFor === "fill") onCloseColorPopover?.();
    else onOpenFillColorPopover?.();
  }
  function openStroke() {
    setOpenPanel(null);
    if (colorPopoverOpenFor === "stroke") onCloseColorPopover?.();
    else onOpenStrokeColorPopover?.();
  }

  const swatchShadow = "0 0 0 1.5px rgba(0,0,0,0.18), 0 0 0 3px #fff, 0 0 0 4.5px rgba(0,0,0,0.10)";

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 toolbar-enter flex items-end gap-1 px-3 pt-2.5 pb-2 rounded-2xl z-[200]"
      style={{
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {/* Color swatch button(s) — open ColorPopover via parent */}
      {showDual ? (
        <div className="flex items-end gap-1">
          <ToolbarBtn
            active={colorPopoverOpenFor === "fill"}
            title="Fill colour"
            label="Fill"
            onClick={(e) => { e.stopPropagation(); openFill(); }}
          >
            <span className="block rounded-full flex-shrink-0" style={{ width: 20, height: 20, background: color, boxShadow: swatchShadow }} />
          </ToolbarBtn>
          <ToolbarBtn
            active={colorPopoverOpenFor === "stroke"}
            title="Stroke colour"
            label="Stroke"
            onClick={(e) => { e.stopPropagation(); openStroke(); }}
          >
            <span className="block rounded-full flex-shrink-0" style={{ width: 20, height: 20, background: strokeColor, boxShadow: swatchShadow }} />
          </ToolbarBtn>
        </div>
      ) : (
        <ToolbarBtn
          active={colorPopoverOpenFor === "fill"}
          title="Colour"
          label="Color"
          onClick={(e) => { e.stopPropagation(); openFill(); }}
        >
          <span className="block rounded-full flex-shrink-0" style={{ width: 20, height: 20, background: color, boxShadow: swatchShadow }} />
        </ToolbarBtn>
      )}

      {/* Thin vertical separator */}
      <div className="w-px self-stretch my-1 bg-black/[0.09] mx-0.5 flex-shrink-0" />

      {/* Stroke weight button + popover */}
      <div className="relative">
        <ToolbarBtn
          active={weightOpen}
          title="Stroke weight"
          label={`${strokeWeight}px`}
          onClick={() => { setOpenPanel((v) => { const next = v === "weight" ? null : "weight"; if (next) onPopoverOpened?.(); return next; }); }}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
            <line x1="3" y1="5.5" x2="17" y2="5.5" stroke="#444" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="3" y1="10"  x2="17" y2="10"  stroke="#444" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="3" y1="15"  x2="17" y2="15"  stroke="#444" strokeWidth="4"   strokeLinecap="round" />
          </svg>
        </ToolbarBtn>

        {weightOpen && (
          <div
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-4 pt-3.5 pb-4 rounded-2xl popover-enter"
            style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              width: 200,
              border: "1px solid rgba(0,0,0,0.07)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-400 select-none">
                Weight
              </span>
              <span className="text-sm font-semibold text-gray-800 tabular-nums">
                {strokeWeight}<span className="text-xs font-normal text-gray-400 ml-0.5">px</span>
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={60}
              value={strokeWeight}
              onChange={(e) => onStrokeWeightChange(Number(e.target.value))}
              className="toolbar-slider"
              style={{ background: `linear-gradient(to right, #111 ${((strokeWeight - 1) / 59) * 100}%, #e0e0e0 ${((strokeWeight - 1) / 59) * 100}%)` }}
            />
            {/* Visual weight preview — width and height scale with the value */}
            <div className="flex items-center justify-center mt-3">
              <div
                className="rounded-full bg-gray-700 transition-all duration-100"
                style={{
                  width: Math.min(strokeWeight * 2.5 + 20, 120),
                  height: Math.max(2, Math.min(strokeWeight, 16)),
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Opacity button + popover */}
      <div className="relative">
        <ToolbarBtn
          active={opacityOpen}
          title="Transparency"
          label={`${Math.round(opacity * 100)}%`}
          onClick={() => { setOpenPanel((v) => { const next = v === "opacity" ? null : "opacity"; if (next) onPopoverOpened?.(); return next; }); }}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
            <circle cx="10" cy="10" r="7.5" stroke="#444" strokeWidth="1.4" />
            <path d="M10 2.5 a7.5 7.5 0 0 1 0 15" fill="#444" />
            <line x1="5" y1="5" x2="15" y2="15" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </ToolbarBtn>

        {opacityOpen && (
          <div
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-4 pt-3.5 pb-4 rounded-2xl popover-enter"
            style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              width: 200,
              border: "1px solid rgba(0,0,0,0.07)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-400 select-none">
                Opacity
              </span>
              <span className="text-sm font-semibold text-gray-800 tabular-nums">
                {Math.round(opacity * 100)}<span className="text-xs font-normal text-gray-400 ml-0.5">%</span>
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(opacity * 100)}
              onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
              className="toolbar-slider"
              style={{ background: `linear-gradient(to right, #111 ${Math.round(opacity * 100)}%, #e0e0e0 ${Math.round(opacity * 100)}%)` }}
            />
            {/* Visual opacity preview */}
            <div className="flex items-center justify-center mt-3">
              <div
                className="w-8 h-8 rounded-lg border border-gray-200"
                style={{
                  background: `repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px`,
                }}
              >
                <div
                  className="w-full h-full rounded-lg transition-all duration-100"
                  style={{ background: color, opacity }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
