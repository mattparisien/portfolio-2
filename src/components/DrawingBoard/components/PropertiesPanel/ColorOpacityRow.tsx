"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const SWATCH_SHADOW =
  "0 0 0 1.5px rgba(0,0,0,0.14), 0 0 0 3px #fff, 0 0 0 4.5px rgba(0,0,0,0.07)";

export interface ColorOpacityRowProps {
  color: string;
  opacity: number; // 0–100
  isOpen: boolean;
  onSwatchClick: () => void;
  onColorChange: (hex: string) => void;
  onOpacityChange: (v: number) => void; // 0–100
  gradientCss?: string;
}

export default function ColorOpacityRow({
  color,
  opacity,
  isOpen,
  onSwatchClick,
  onColorChange,
  onOpacityChange,
  gradientCss,
}: ColorOpacityRowProps) {
  const [hex, setHex] = useState(color);
  const [opacityVal, setOpacityVal] = useState(String(opacity));
  const [editingOpacity, setEditingOpacity] = useState(false);

  const dragging = useRef(false);
  const startX = useRef(0);
  const startOpacity = useRef(opacity);
  const opacityInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setHex(color); }, [color]);
  useEffect(() => { if (!editingOpacity) setOpacityVal(String(opacity)); }, [opacity, editingOpacity]);

  const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)));

  const handleScrubDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startOpacity.current = opacity;

      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        onOpacityChange(clamp(startOpacity.current + (ev.clientX - startX.current)));
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
    [opacity, onOpacityChange]
  );

  const commitOpacity = useCallback(() => {
    const parsed = parseFloat(opacityVal);
    if (!isNaN(parsed)) onOpacityChange(clamp(parsed));
    else setOpacityVal(String(opacity));
    setEditingOpacity(false);
  }, [opacityVal, opacity, onOpacityChange]);

  return (
    <div className="flex hover:ring-[0.5px] hover:ring-neutral-300 items-stretch min-h-6 w-full rounded-ui-component overflow-hidden bg-black/[0.04] text-[12px]">

      {/* Left half: swatch + hex */}
      <div className="flex items-center w-2/3 min-w-0">
        <button
          title="Pick colour"
          onClick={(e) => { e.stopPropagation(); onSwatchClick(); }}
          className="flex items-center justify-center px-2 self-stretch flex-shrink-0 cursor-pointer bg-transparent border-0"
        >
          <span
            className="rounded-sm block"
            style={{
              width: 14,
              height: 14,
              background: gradientCss ?? color
            }}
          />
        </button>
        <div className="w-px bg-bg self-stretch flex-shrink-0" />
        <input
          type="text"
          value={hex}
          maxLength={7}
          spellCheck={false}
          placeholder="#000000"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const v = e.target.value;
            setHex(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onColorChange(v);
          }}
          onBlur={() => setHex(color)}
          className="flex-1 min-w-0 px-2 text-[11px] font-mono font-medium text-black/60 uppercase tracking-wider bg-transparent border-0 outline-none"
        />
      </div>

      {/* Divider */}
      <div className="w-px bg-bg self-stretch flex-shrink-0" />

      {/* Right half: opacity value + % scrub handle */}
      <div className="flex items-center pl-2 w-1/3 min-w-0">
        <input
          ref={opacityInputRef}
          type="text"
          inputMode="numeric"
          value={editingOpacity ? opacityVal : String(opacity)}
          onFocus={() => { setEditingOpacity(true); setOpacityVal(String(opacity)); }}
          onChange={(e) => setOpacityVal(e.target.value)}
          onBlur={commitOpacity}
          onKeyDown={(e) => {
            if (e.key === "Enter") { commitOpacity(); opacityInputRef.current?.blur(); }
            else if (e.key === "Escape") { setOpacityVal(String(opacity)); setEditingOpacity(false); opacityInputRef.current?.blur(); }
            else if (e.key === "ArrowUp") { e.preventDefault(); onOpacityChange(clamp(opacity + 1)); }
            else if (e.key === "ArrowDown") { e.preventDefault(); onOpacityChange(clamp(opacity - 1)); }
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none tabular-nums text-black/70 font-semibold text-[11px] text-left"
        />
        <span
          onMouseDown={handleScrubDown}
          className="flex-shrink-0 px-2 self-stretch flex items-center text-[11px] font-semibold text-black/40 hover:text-black/70 select-none transition-colors cursor-ew-resize"
        >
          %
        </span>
      </div>

    </div>
  );
}
