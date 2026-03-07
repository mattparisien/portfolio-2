"use client";

import { useState, useEffect } from "react";
import type { TextProps } from "../types";
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
  onApply: (updates: Partial<TextProps>) => void;
  closeSignal?: number;
  onPopoverOpened?: () => void;
  /** Shared color popover control — managed by the parent (DrawingBoard) */
  colorPopoverOpen?: boolean;
  onOpenColorPopover?: () => void;
  onCloseColorPopover?: () => void;
}

function Divider() {
  return <div className="w-px self-stretch my-1 bg-black/[0.09] flex-shrink-0" />;
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
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-150 select-none cursor-pointer flex-shrink-0 ${
        active
          ? "bg-black text-white shadow-sm"
          : "hover:bg-black/[0.07] text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

function StepBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-6 h-6 rounded-md flex items-center justify-center text-sm font-semibold text-gray-500 hover:bg-black/[0.07] hover:text-gray-900 transition-all duration-150 select-none cursor-pointer flex-shrink-0"
    >
      {children}
    </button>
  );
}

export default function TextToolbar({ textProps, color, onApply, closeSignal, onPopoverOpened, colorPopoverOpen, onOpenColorPopover, onCloseColorPopover }: TextToolbarProps) {
  const { fontFamily, fontSize, bold, italic, underline, linethrough, uppercase, lineHeight, charSpacing, textAlign, gradient, effect } = textProps;

  const [effectOpen, setEffectOpen] = useState(false);
  const [lineHeightOpen, setLineHeightOpen] = useState(false);
  const [letterSpacingOpen, setLetterSpacingOpen] = useState(false);
  const colorTriggerRef = useRef<HTMLDivElement>(null);

  // Close all when a sibling component opens a popover
  useEffect(() => {
    if (!closeSignal) return;
    setEffectOpen(false);
    setLineHeightOpen(false);
    setLetterSpacingOpen(false);
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
      className="absolute bottom-6 left-1/2 toolbar-enter flex items-center gap-2 px-3 py-2 rounded-2xl z-[200]"
      style={{
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.06)",
        maxWidth: "calc(100vw - 32px)",
        overflowX: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(0,0,0,0.15) transparent",
      }}
    >
      {/* ── Color / gradient ── */}
      <div className="relative flex items-center flex-shrink-0">
        <button
          title="Text color"
          onClick={(e) => { e.stopPropagation(); setColorOpen((v) => !v); setEffectOpen(false); setLineHeightOpen(false); setLetterSpacingOpen(false); onPopoverOpened?.(); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105"
          style={{ background: colorPopoverOpen ? "rgba(0,0,0,0.09)" : "transparent" }}
        >
          <span style={swatchStyle} className="flex-shrink-0 block" />
        </button>
      </div>

      {/* ── Effects ── */}
      <div className="relative flex items-center flex-shrink-0">
        <button
          title="Text effects"
          onClick={(e) => { e.stopPropagation(); setEffectOpen((v) => !v); setColorOpen(false); setLineHeightOpen(false); setLetterSpacingOpen(false); onPopoverOpened?.(); }}
          className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105 select-none"
          style={{
            background: effectOpen ? "rgba(0,0,0,0.09)" : effect ? "#111" : "transparent",
            color: effect && !effectOpen ? "#fff" : "#444",
          }}
        >
          <svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor">
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

      <Divider />

      {/* ── Font family ── */}
      <div className="flex items-center flex-shrink-0">
        <select
          value={fontFamily}
          onChange={(e) => onApply({ fontFamily: e.target.value })}
          title="Font family"
          className="text-xs rounded-lg px-2 py-1.5 bg-transparent cursor-pointer outline-none transition-colors hover:bg-black/[0.05] text-gray-700 font-medium border-0"
          style={{ fontFamily, minWidth: 100, maxWidth: 116 }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <Divider />

      {/* ── Font size ── */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <StepBtn
          title="Decrease font size"
          onClick={() => { const i = FONT_SIZES.indexOf(fontSize); if (i > 0) onApply({ fontSize: FONT_SIZES[i - 1] }); }}
        >
          <svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor"><rect x="1" y="5.5" width="10" height="1.5" rx="0.75"/></svg>
        </StepBtn>
        <select
          value={fontSize}
          onChange={(e) => onApply({ fontSize: Number(e.target.value) })}
          title="Font size"
          className="text-xs rounded-lg px-1 py-1.5 bg-transparent cursor-pointer outline-none transition-colors hover:bg-black/[0.05] text-gray-700 font-semibold tabular-nums text-center border-0 w-10"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <StepBtn
          title="Increase font size"
          onClick={() => { const i = FONT_SIZES.indexOf(fontSize); if (i < FONT_SIZES.length - 1) onApply({ fontSize: FONT_SIZES[i + 1] }); }}
        >
          <svg viewBox="0 0 12 12" width="10" height="10" fill="currentColor"><rect x="1" y="5.5" width="10" height="1.5" rx="0.75"/><rect x="5.5" y="1" width="1.5" height="10" rx="0.75"/></svg>
        </StepBtn>
      </div>

      <Divider />

      {/* ── Style toggles: B I U S AA ── */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <ToggleBtn active={bold} title="Bold" onClick={() => onApply({ bold: !bold })} style={{ fontWeight: 700 }}>B</ToggleBtn>
        <ToggleBtn active={italic} title="Italic" onClick={() => onApply({ italic: !italic })} style={{ fontStyle: "italic" }}>I</ToggleBtn>
        <ToggleBtn active={underline} title="Underline" onClick={() => onApply({ underline: !underline })} style={{ textDecoration: "underline" }}>U</ToggleBtn>
        <ToggleBtn active={linethrough} title="Strikethrough" onClick={() => onApply({ linethrough: !linethrough })} style={{ textDecoration: "line-through" }}>S</ToggleBtn>
        <ToggleBtn active={uppercase} title="All caps" onClick={() => onApply({ uppercase: !uppercase })}>
          <span className="text-xs font-bold tracking-wider">AA</span>
        </ToggleBtn>
      </div>

      <Divider />

      {/* ── Text alignment ── */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <ToggleBtn active={textAlign === "left"} title="Align left" onClick={() => onApply({ textAlign: "left" })}>
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
            <rect x="1" y="2" width="14" height="1.8" rx="0.9"/>
            <rect x="1" y="5.8" width="9" height="1.8" rx="0.9"/>
            <rect x="1" y="9.6" width="12" height="1.8" rx="0.9"/>
            <rect x="1" y="13.4" width="7" height="1.8" rx="0.9"/>
          </svg>
        </ToggleBtn>
        <ToggleBtn active={textAlign === "center"} title="Align center" onClick={() => onApply({ textAlign: "center" })}>
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
            <rect x="1" y="2" width="14" height="1.8" rx="0.9"/>
            <rect x="3.5" y="5.8" width="9" height="1.8" rx="0.9"/>
            <rect x="2" y="9.6" width="12" height="1.8" rx="0.9"/>
            <rect x="4.5" y="13.4" width="7" height="1.8" rx="0.9"/>
          </svg>
        </ToggleBtn>
        <ToggleBtn active={textAlign === "right"} title="Align right" onClick={() => onApply({ textAlign: "right" })}>
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
            <rect x="1" y="2" width="14" height="1.8" rx="0.9"/>
            <rect x="6" y="5.8" width="9" height="1.8" rx="0.9"/>
            <rect x="3" y="9.6" width="12" height="1.8" rx="0.9"/>
            <rect x="8" y="13.4" width="7" height="1.8" rx="0.9"/>
          </svg>
        </ToggleBtn>
      </div>

      <Divider />

      {/* ── Line height ── */}
      <div className="relative flex items-center flex-shrink-0">
        <button
          title="Line height"
          onClick={(e) => { e.stopPropagation(); setLineHeightOpen((v) => !v); setLetterSpacingOpen(false); setColorOpen(false); setEffectOpen(false); onPopoverOpened?.(); }}
          className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 select-none ${lineHeightOpen ? "bg-black/[0.09]" : "hover:bg-black/[0.07]"}`}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="text-gray-600">
            <line x1="8" y1="1" x2="8" y2="5"/>
            <polyline points="6,3 8,1 10,3"/>
            <line x1="3" y1="6.5" x2="13" y2="6.5"/>
            <line x1="3" y1="9.5" x2="13" y2="9.5"/>
            <line x1="8" y1="11" x2="8" y2="15"/>
            <polyline points="6,13 8,15 10,13"/>
          </svg>
        </button>
        {lineHeightOpen && (
          <div
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-4 pt-3.5 pb-4 rounded-2xl popover-enter"
            style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              width: 200,
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
              zIndex: 300,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 select-none">Line Height</span>
              <span className="text-sm font-semibold text-gray-800 tabular-nums">{lineHeight.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={4}
              step={0.1}
              value={lineHeight}
              onChange={(e) => onApply({ lineHeight: Math.round(Number(e.target.value) * 10) / 10 })}
              className="toolbar-slider"
              style={{ background: `linear-gradient(to right, #111 ${((lineHeight - 0.5) / 3.5) * 100}%, #e0e0e0 ${((lineHeight - 0.5) / 3.5) * 100}%)` }}
            />
          </div>
        )}
      </div>

      <Divider />

      {/* ── Letter spacing ── */}
      <div className="relative flex items-center flex-shrink-0">
        <button
          title="Letter spacing"
          onClick={(e) => { e.stopPropagation(); setLetterSpacingOpen((v) => !v); setLineHeightOpen(false); setColorOpen(false); setEffectOpen(false); onPopoverOpened?.(); }}
          className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 select-none ${letterSpacingOpen ? "bg-black/[0.09]" : "hover:bg-black/[0.07]"}`}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="text-gray-600">
            <line x1="1" y1="8" x2="5" y2="8"/>
            <polyline points="3,6 1,8 3,10"/>
            <line x1="4" y1="3" x2="12" y2="3"/>
            <line x1="4" y1="6" x2="12" y2="6"/>
            <line x1="4" y1="9" x2="12" y2="9"/>
            <line x1="4" y1="12" x2="12" y2="12"/>
            <line x1="11" y1="8" x2="15" y2="8"/>
            <polyline points="13,6 15,8 13,10"/>
          </svg>
        </button>
        {letterSpacingOpen && (
          <div
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-4 pt-3.5 pb-4 rounded-2xl popover-enter"
            style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              width: 200,
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
              zIndex: 300,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 select-none">Letter Spacing</span>
              <span className="text-sm font-semibold text-gray-800 tabular-nums">{charSpacing}</span>
            </div>
            <input
              type="range"
              min={-200}
              max={1000}
              step={5}
              value={charSpacing}
              onChange={(e) => onApply({ charSpacing: Number(e.target.value) })}
              className="toolbar-slider"
              style={{ background: `linear-gradient(to right, #111 ${((charSpacing + 200) / 1200) * 100}%, #e0e0e0 ${((charSpacing + 200) / 1200) * 100}%)` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
