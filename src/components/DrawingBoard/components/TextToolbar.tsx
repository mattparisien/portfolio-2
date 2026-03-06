"use client";

import type { TextProps } from "../types";
import ColorButton from "./ColorButton";

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
  onColorChange: (c: string) => void;
  onApply: (updates: Partial<TextProps>) => void;
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

export default function TextToolbar({ textProps, color, onColorChange, onApply }: TextToolbarProps) {
  const { fontFamily, fontSize, bold, italic, underline, linethrough, uppercase, lineHeight, charSpacing, textAlign } = textProps;

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 rounded-2xl shadow-xl overflow-x-auto z-[200]"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        maxWidth: "calc(100vw - 32px)",
        whiteSpace: "nowrap",
      }}
    >
      {/* Color dot */}
      <div className="flex items-center border-r border-gray-200 pr-2 mr-0.5 flex-shrink-0">
        <ColorButton color={color} title="Text color" onChange={onColorChange} size={24} />
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
