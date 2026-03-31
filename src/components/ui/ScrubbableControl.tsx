"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export interface ScrubbableControlProps {
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  sensitivity?: number;
  onChange: (v: number) => void;
  /** When provided, the left slot becomes a clickable button and scrubbing moves to the value area. */
  onIconClick?: () => void;
}

export default function ScrubbableControl({
  icon,
  value,
  min,
  max,
  step = 1,
  unit = "",
  sensitivity = 1,
  onChange,
  onIconClick,
}: ScrubbableControlProps) {
  const [inputVal, setInputVal] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startValue = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input text in sync when value changes externally (not while user types)
  useEffect(() => {
    if (!editing) setInputVal(String(value));
  }, [value, editing]);

  const clamp = useCallback(
    (v: number) =>
      Math.round(Math.min(max, Math.max(min, v)) / step) * step,
    [min, max, step]
  );

  const handleScrubDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startValue.current = value;

      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = (ev.clientX - startX.current) * sensitivity * step;
        onChange(clamp(startValue.current + delta));
      };

      const onUp = () => {
        dragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [value, sensitivity, step, onChange, clamp]
  );

  const commitInput = useCallback(() => {
    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed)) onChange(clamp(parsed));
    else setInputVal(String(value));
    setEditing(false);
  }, [inputVal, value, onChange, clamp]);

  return (
    <div className="flex hover:ring-[0.5px] hover:ring-neutral-300 items-stretch min-h-6 flex-1 min-w-0 overflow-hidden bg-black/[0.04] text-[12px] rounded-ui-component">
      {/* Left slot — scrub handle OR clickable icon */}
      {onIconClick ? (
        <button
          onClick={(e) => { e.stopPropagation(); onIconClick(); }}
          className="flex items-center justify-center p-1 cursor-pointer bg-transparent border-0 flex-shrink-0"
        >
          {icon}
        </button>
      ) : (
        <div
          data-scrub-handle
          onMouseDown={handleScrubDown}
          className="flex items-center justify-center p-1 text-neutral-500 transition-colors select-none cursor-ew-resize"
          title="Drag to scrub"
        >
          {icon}
        </div>
      )}

      {/* Divider */}
      <div className="w-px bg-bg self-stretch" />

      {/* Value input — also the scrub area when onIconClick is set */}
      <div
        className={`flex font-light items-center flex-1 min-w-0 px-2 gap-0.5${onIconClick && !editing ? " cursor-ew-resize" : ""}`}
        onMouseDown={
          onIconClick
            ? (e) => {
                if ((e.target as HTMLElement).tagName !== "INPUT") handleScrubDown(e);
              }
            : undefined
        }
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={editing ? inputVal : `${value}${unit}`}
          onFocus={() => {
            setEditing(true);
            setInputVal(String(value));
          }}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={commitInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitInput();
              inputRef.current?.blur();
            } else if (e.key === "Escape") {
              setInputVal(String(value));
              setEditing(false);
              inputRef.current?.blur();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              onChange(clamp(value + step));
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              onChange(clamp(value - step));
            }
          }}
          className="w-full bg-transparent border-0 outline-none tabular-nums text-black/70 font-semibold text-[11px] text-left"
        />
      </div>
    </div>
  );
}