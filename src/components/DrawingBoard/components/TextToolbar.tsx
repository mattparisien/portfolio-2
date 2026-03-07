"use client";

import { useState, useRef, useEffect } from "react";
import type { Canvas } from "fabric";
import type { TextProps } from "../types";
import ColorPopover from "./ColorPopover";
import TextEffectsPopover from "./TextEffectsPopover";

const FONT_FAMILIES = [
  "sans-serif",
  "serif",
  "monospace",
  "Arial",
  "Georgia",
  "Impact",
  "Courier New",
  "Trebuchet MS",
  "Comic Sans MS",
  "Palatino",
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96, 128];

interface TextToolbarProps {
  textProps: TextProps;
  color: string;
  fabricRef: React.MutableRefObject<Canvas | null>;
  onColorChange: (c: string) => void;
  onApply: (updates: Partial<TextProps>) => void;
  closeSignal?: number;
  onPopoverOpened?: () => void;
}

function ToggleBtn({
  active,
  title,
  onClick,
  children,
  style,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={style}
      className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors select-none cursor-pointer
        ${active ? "bg-black text-white" : "hover:bg-gray-100 text-gray-700"}`}
    >
      {children}
    </button>
  );
}

export default function TextToolbar({ textProps, color, fabricRef, onColorChange, onApply, closeSignal, onPopoverOpened }: TextToolbarProps) {
  const { fontFamily, fontSize, bold, italic, underline, linethrough, uppercase, lineHeight, charSpacing, textAlign, gradient, effect } = textProps;

  const [colorOpen, setColorOpen] = useState(false);
  const [effectOpen, setEffectOpen] = useState(false);
  const colorTriggerRef = useRef<HTMLDivElement>(null);

  // Close all when a sibling component opens a popover
  useEffect(() => {
    if (!closeSignal) return;
    setColorOpen(false);
    setEffectOpen(false);
  }, [closeSignal]);

  // Determine display swatch — gradient pill or solid dot
  const swatchStyle: React.CSSProperties = (() => {
    if (!gradient) return { background: color, borderRadius: "50%", width: 18, height: 18, outline: "1.5px solid rgba(0,0,0,0.15)" };
    const sorted = [...gradient.stops].sort((a, b) => a.offset - b.offset);
    const parts = sorted.map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ");
    return { background: `linear-gradient(${gradient.angle}deg, ${parts})`, borderRadius: 6, width: 28, height: 18 };
  })();

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 rounded-2xl overflow-x-auto z-[200]"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(0,0,0,0.08)",
        maxWidth: "calc(100vw - 32px)",
        whiteSpace: "nowrap",
      }}
    >
      {/* Color / gradient trigger — opens ColorPopover */}
      <div
        className="relative flex items-center border-r border-gray-200 pr-2 mr-0.5 flex-shrink-0"
        ref={colorTriggerRef}
      >
        <button
          title="Text color"
          onClick={(e) => { e.stopPropagation(); setColorOpen((v) => !v); setEffectOpen(false); onPopoverOpened?.(); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-black/[0.07]"
          style={{ background: colorOpen ? "rgba(0,0,0,0.08)" : "transparent" }}
        >
          <span style={swatchStyle} className="flex-shrink-0 block" />
        </button>

        {colorOpen && (
          <ColorPopover
            color={color}
            gradient={gradient}
            fabricRef={fabricRef}
            onColorChange={(c) => { onColorChange(c); }}
            onGradientChange={(g) => onApply({ gradient: g })}
            onClose={() => setColorOpen(false)}
          />
        )}
      </div>

      {/* Effects trigger — opens TextEffectsPopover */}
      <div className="relative flex items-center border-r border-gray-200 pr-2 mr-0.5 flex-shrink-0">
        <button
          title="Text effects"
          onClick={(e) => { e.stopPropagation(); setEffectOpen((v) => !v); setColorOpen(false); onPopoverOpened?.(); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-black/[0.07] select-none"
          style={{
            background: effectOpen ? "rgba(0,0,0,0.08)" : effect ? "#000" : "transparent",
            color: effect && !effectOpen ? "#fff" : "inherit",
          }}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
            <path d="M10 2a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L10 14.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L2.82 8.125a.75.75 0 0 1 .416-1.28l4.21-.611L9.327 2.418A.75.75 0 0 1 10 2Z" />
          </svg>
        </button>
        {effectOpen && (
          <TextEffectsPopover
            effect={effect ?? null}
            onApply={(e) => onApply({ effect: e })}
            onClose={() => setEffectOpen(false)}
          />
        )}
      </div>

      {/* Font family */}
      <div className="flex items-center border-r border-gray-200 pr-2 mr-0.5 flex-shrink-0">
        <select
          value={fontFamily}
          onChange={(e) => onApply({ fontFamily: e.target.value })}
          className="text-xs rounded-lg border border-gray-200 px-1 py-1 bg-white cursor-pointer outline-none hover:border-gray-400 transition-colors"
          style={{ fontFamily, width: 108 }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* Font size */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-0.5 flex-shrink-0">
        <button
          onClick={() => { const i = FONT_SIZES.indexOf(fontSize); if (i > 0) onApply({ fontSize: FONT_SIZES[i - 1] }); }}
          className="w-5 h-5 rounded flex items-center justify-center text-sm font-bold hover:bg-gray-100 transition-colors select-none cursor-pointer"
        >−</button>
        <select
          value={fontSize}
          onChange={(e) => onApply({ fontSize: Number(e.target.value) })}
          className="text-xs rounded-lg border border-gray-200 px-0.5 py-1 bg-white cursor-pointer outline-none hover:border-gray-400 transition-colors w-12 text-center"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => { const i = FONT_SIZES.indexOf(fontSize); if (i < FONT_SIZES.length - 1) onApply({ fontSize: FONT_SIZES[i + 1] }); }}
          className="w-5 h-5 rounded flex items-center justify-center text-sm font-bold hover:bg-gray-100 transition-colors select-none cursor-pointer"
        >+</button>
      </div>

      {/* Style toggles */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-0.5 flex-shrink-0">
        <ToggleBtn active={bold} title="Bold" onClick={() => onApply({ bold: !bold })} style={{ fontWeight: "bold" }}>B</ToggleBtn>
        <ToggleBtn active={italic} title="Italic" onClick={() => onApply({ italic: !italic })} style={{ fontStyle: "italic" }}>I</ToggleBtn>
        <ToggleBtn active={underline} title="Underline" onClick={() => onApply({ underline: !underline })} style={{ textDecoration: "underline" }}>U</ToggleBtn>
        <ToggleBtn active={linethrough} title="Strikethrough" onClick={() => onApply({ linethrough: !linethrough })} style={{ textDecoration: "line-through" }}>S</ToggleBtn>
        <ToggleBtn active={uppercase} title="Uppercase" onClick={() => onApply({ uppercase: !uppercase })}>
          <span className="text-[10px] font-bold tracking-wider">AA</span>
        </ToggleBtn>
      </div>

      {/* Line height */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-0.5 flex-shrink-0">
        <span className="text-gray-400 select-none" title="Line height" style={{ fontSize: 13 }}>↕</span>
        <button
          onClick={() => onApply({ lineHeight: Math.max(0.5, Math.round((lineHeight - 0.1) * 10) / 10) })}
          className="w-5 h-5 rounded flex items-center justify-center text-sm font-bold hover:bg-gray-100 transition-colors select-none cursor-pointer"
        >−</button>
        <span className="text-xs w-6 text-center tabular-nums">{lineHeight.toFixed(1)}</span>
        <button
          onClick={() => onApply({ lineHeight: Math.min(4, Math.round((lineHeight + 0.1) * 10) / 10) })}
          className="w-5 h-5 rounded flex items-center justify-center text-sm font-bold hover:bg-gray-100 transition-colors select-none cursor-pointer"
        >+</button>
      </div>

      {/* Text alignment */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-0.5 flex-shrink-0">
        <ToggleBtn active={textAlign === "left"} title="Align left" onClick={() => onApply({ textAlign: "left" })}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="6" width="9" height="2" rx="1"/><rect x="1" y="10" width="12" height="2" rx="1"/><rect x="1" y="14" width="7" height="2" rx="1"/>
          </svg>
        </ToggleBtn>
        <ToggleBtn active={textAlign === "center"} title="Align center" onClick={() => onApply({ textAlign: "center" })}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <rect x="1" y="2" width="14" height="2" rx="1"/><rect x="3.5" y="6" width="9" height="2" rx="1"/><rect x="2" y="10" width="12" height="2" rx="1"/><rect x="4.5" y="14" width="7" height="2" rx="1"/>
          </svg>
        </ToggleBtn>
        <ToggleBtn active={textAlign === "right"} title="Align right" onClick={() => onApply({ textAlign: "right" })}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <rect x="1" y="2" width="14" height="2" rx="1"/><rect x="6" y="6" width="9" height="2" rx="1"/><rect x="3" y="10" width="12" height="2" rx="1"/><rect x="8" y="14" width="7" height="2" rx="1"/>
          </svg>
        </ToggleBtn>
      </div>

      {/* Letter spacing */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <span className="text-gray-400 select-none" title="Letter spacing" style={{ fontSize: 13 }}>↔</span>
        <button
          onClick={() => onApply({ charSpacing: Math.max(-200, charSpacing - 25) })}
          className="w-5 h-5 rounded flex items-center justify-center text-sm font-bold hover:bg-gray-100 transition-colors select-none cursor-pointer"
        >−</button>
        <span className="text-xs w-7 text-center tabular-nums">{charSpacing}</span>
        <button
          onClick={() => onApply({ charSpacing: Math.min(1000, charSpacing + 25) })}
          className="w-5 h-5 rounded flex items-center justify-center text-sm font-bold hover:bg-gray-100 transition-colors select-none cursor-pointer"
        >+</button>
      </div>
    </div>
  );
}
