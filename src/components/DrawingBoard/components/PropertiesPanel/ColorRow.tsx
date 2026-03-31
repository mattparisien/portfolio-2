"use client";

import { useState, useEffect } from "react";

const SWATCH_SHADOW =
  "0 0 0 1.5px rgba(0,0,0,0.14), 0 0 0 3.5px #fff, 0 0 0 5px rgba(0,0,0,0.07)";

export interface ColorRowProps {
  color: string;
  isOpen: boolean;
  onSwatchClick: () => void;
  onColorChange: (hex: string) => void;
  gradientCss?: string;
}

export default function ColorRow({
  color,
  isOpen,
  onSwatchClick,
  onColorChange,
  gradientCss,
}: ColorRowProps) {
  const [hex, setHex] = useState(color);

  useEffect(() => {
    setHex(color);
  }, [color]);

  return (
    <div className="flex items-center gap-2 px-1">
      <button
        title="Pick colour"
        onClick={(e) => {
          e.stopPropagation();
          onSwatchClick();
        }}
        className="flex-shrink-0 rounded-full cursor-pointer transition-transform hover:scale-110 active:scale-95"
        style={{
          width: 22,
          height: 22,
          background: gradientCss ?? color,
        }}
      />
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
        className="flex-1 min-w-0 text-[11px] font-mono font-medium text-black/60 uppercase tracking-wider bg-black/[0.04] rounded-lg px-2 py-1.5 border-0 outline-none focus:bg-black/[0.08] transition-colors"
      />
    </div>
  );
}
