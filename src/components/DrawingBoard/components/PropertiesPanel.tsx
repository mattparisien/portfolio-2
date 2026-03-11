"use client";

import { useState, useEffect } from "react";
import type { TextProps, Tool } from "../types";
import {
  MdRemove,
  MdAdd,
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
} from "react-icons/md";

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

export interface PropertiesPanelProps {
  tool: Tool;
  hasSelection: boolean;
  selectedIsText: boolean;
  selectedIsShape: boolean;
  /** Fill / drawing color */
  color: string;
  /** Shape stroke color — only passed when a shape is selected */
  strokeColor?: string;
  opacity: number;
  strokeWeight: number;
  textProps: TextProps;
  onOpacityChange: (v: number) => void;
  onStrokeWeightChange: (v: number) => void;
  onApplyText: (updates: Partial<TextProps>) => void;
  /** Which color slot is open — managed by parent */
  fillColorOpen: boolean;
  strokeColorOpen: boolean;
  textColorOpen: boolean;
  onOpenFillColor: () => void;
  onOpenStrokeColor: () => void;
  onOpenTextColor: () => void;
  onCloseColor: () => void;
  /** Direct hex change from the inline input (bypasses popover) */
  onFillColorChange: (hex: string) => void;
  onStrokeColorChange?: (hex: string) => void;
  onTextColorChange: (hex: string) => void;
}

// ── Primitives ───────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-black/30 mb-2 select-none">
      {children}
    </p>
  );
}

function Rule() {
  return <div className="h-px bg-black/[0.07]" />;
}

const SWATCH_SHADOW =
  "0 0 0 1.5px rgba(0,0,0,0.14), 0 0 0 3.5px #fff, 0 0 0 5px rgba(0,0,0,0.07)";

function ColorRow({
  color,
  isOpen,
  onSwatchClick,
  onColorChange,
}: {
  color: string;
  isOpen: boolean;
  onSwatchClick: () => void;
  onColorChange: (hex: string) => void;
}) {
  const [hex, setHex] = useState(color);

  // Sync when external color changes (e.g. from the picker)
  useEffect(() => { setHex(color); }, [color]);

  return (
    <div className="flex items-center gap-2 px-1">
      {/* Swatch button — opens/closes the color popover */}
      <button
        title="Pick colour"
        onClick={(e) => { e.stopPropagation(); onSwatchClick(); }}
        className="flex-shrink-0 rounded-full cursor-pointer transition-transform hover:scale-110 active:scale-95"
        style={{
          width: 22,
          height: 22,
          background: color,
          boxShadow: isOpen
            ? `0 0 0 2px #fff, 0 0 0 4px #000`
            : SWATCH_SHADOW,
        }}
      />
      {/* Editable hex input */}
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

function InlineSlider({
  label,
  value,
  displayValue,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-black/40 select-none">{label}</span>
        <span className="text-[11px] font-semibold tabular-nums text-black/60 select-none">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="toolbar-slider w-full"
        style={{
          background: `linear-gradient(to right, #111 ${pct}%, #e0e0e0 ${pct}%)`,
        }}
      />
    </div>
  );
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
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-7 h-7 rounded-md bg-black/[0.04] hover:bg-black/[0.09] flex items-center justify-center text-gray-500 transition-colors cursor-pointer flex-shrink-0"
    >
      {children}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function PropertiesPanel({
  selectedIsText,
  selectedIsShape,
  color,
  strokeColor,
  opacity,
  strokeWeight,
  textProps,
  onOpacityChange,
  onStrokeWeightChange,
  onApplyText,
  fillColorOpen,
  strokeColorOpen,
  textColorOpen,
  onOpenFillColor,
  onOpenStrokeColor,
  onOpenTextColor,
  onCloseColor,
  onFillColorChange,
  onStrokeColorChange,
  onTextColorChange,
}: PropertiesPanelProps) {
  const {
    fontFamily,
    fontSize,
    bold,
    italic,
    underline,
    linethrough,
    uppercase,
    lineHeight,
    charSpacing,
    textAlign,
    gradient,
  } = textProps;

  return (
    <div
      className="drawing-ui-overlay fixed right-0 top-0 h-screen w-[220px] panel-slide-in z-[200] flex flex-col overflow-y-auto"
      style={{
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(0,0,0,0.08)",
        paddingTop: 76,
        paddingBottom: 88,
        scrollbarWidth: "none",
      }}
    >
      {selectedIsText ? (
        /* ═══════════════════ TEXT VIEW ═══════════════════ */
        <>
          {/* ── Color ── */}
          <div className="px-4 pt-3 pb-3">
            <SectionLabel>Color</SectionLabel>
            <ColorRow
              color={gradient ? "#000000" : color}
              isOpen={textColorOpen}
              onSwatchClick={() => { if (textColorOpen) onCloseColor(); else onOpenTextColor(); }}
              onColorChange={onTextColorChange}
            />
            {gradient && (
              <div className="mt-1 px-1">
                <span className="text-[11px] font-mono font-medium text-black/40">Gradient</span>
              </div>
            )}
          </div>

          <Rule />

          {/* ── Font ── */}
          <div className="px-4 pt-3 pb-3">
            <SectionLabel>Font</SectionLabel>

            <select
              value={fontFamily}
              onChange={(e) => onApplyText({ fontFamily: e.target.value })}
              title="Font family"
              className="w-full text-[12px] rounded-lg px-2.5 py-1.5 bg-black/[0.04] text-gray-700 font-medium border-0 outline-none cursor-pointer mb-2.5"
              style={{ fontFamily }}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>

            {/* Font size stepper */}
            <div className="flex items-center gap-1.5">
              <StepBtn
                title="Decrease font size"
                onClick={() => {
                  const i = FONT_SIZES.indexOf(fontSize);
                  if (i > 0) onApplyText({ fontSize: FONT_SIZES[i - 1] });
                }}
              >
                <MdRemove size={11} />
              </StepBtn>
              <select
                value={fontSize}
                onChange={(e) => onApplyText({ fontSize: Number(e.target.value) })}
                title="Font size"
                className="flex-1 text-[12px] rounded-md px-1 py-1.5 bg-black/[0.04] cursor-pointer outline-none text-gray-700 font-semibold tabular-nums text-center border-0"
              >
                {FONT_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <StepBtn
                title="Increase font size"
                onClick={() => {
                  const i = FONT_SIZES.indexOf(fontSize);
                  if (i < FONT_SIZES.length - 1)
                    onApplyText({ fontSize: FONT_SIZES[i + 1] });
                }}
              >
                <MdAdd size={11} />
              </StepBtn>
            </div>
          </div>

          <Rule />

          {/* ── Style ── */}
          <div className="px-4 pt-3 pb-3">
            <SectionLabel>Style</SectionLabel>

            {/* B I U S AA — all in one row */}
            <div className="flex items-center gap-0.5 mb-2">
              <ToggleBtn active={bold} title="Bold" onClick={() => onApplyText({ bold: !bold })} style={{ fontWeight: 700 }}>B</ToggleBtn>
              <ToggleBtn active={italic} title="Italic" onClick={() => onApplyText({ italic: !italic })} style={{ fontStyle: "italic" }}>I</ToggleBtn>
              <ToggleBtn active={underline} title="Underline" onClick={() => onApplyText({ underline: !underline })} style={{ textDecoration: "underline" }}>U</ToggleBtn>
              <ToggleBtn active={linethrough} title="Strikethrough" onClick={() => onApplyText({ linethrough: !linethrough })} style={{ textDecoration: "line-through" }}>S</ToggleBtn>
              <ToggleBtn active={uppercase} title="All caps" onClick={() => onApplyText({ uppercase: !uppercase })}>
                <span className="text-[10px] font-bold tracking-wider">AA</span>
              </ToggleBtn>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-0.5">
              <ToggleBtn active={textAlign === "left"} title="Align left" onClick={() => onApplyText({ textAlign: "left" })}>
                <MdFormatAlignLeft size={14} />
              </ToggleBtn>
              <ToggleBtn active={textAlign === "center"} title="Align center" onClick={() => onApplyText({ textAlign: "center" })}>
                <MdFormatAlignCenter size={14} />
              </ToggleBtn>
              <ToggleBtn active={textAlign === "right"} title="Align right" onClick={() => onApplyText({ textAlign: "right" })}>
                <MdFormatAlignRight size={14} />
              </ToggleBtn>
            </div>
          </div>

          <Rule />

          {/* ── Spacing ── */}
          <div className="px-4 pt-3 pb-3">
            <SectionLabel>Spacing</SectionLabel>
            <div className="flex flex-col gap-4">
              <InlineSlider
                label="Line height"
                value={lineHeight}
                displayValue={lineHeight.toFixed(1)}
                min={0.5}
                max={4}
                step={0.1}
                onChange={(v) => onApplyText({ lineHeight: Math.round(v * 10) / 10 })}
              />
              <InlineSlider
                label="Letter spacing"
                value={charSpacing}
                displayValue={String(charSpacing)}
                min={-200}
                max={1000}
                step={5}
                onChange={(v) => onApplyText({ charSpacing: v })}
              />
            </div>
          </div>
        </>
      ) : (
        /* ═══════════════════ OBJECT / DRAWING VIEW ═══════════════════ */
        <>
          {/* ── Fill color ── */}
          <div className="px-4 pt-3 pb-3">
            <SectionLabel>Fill</SectionLabel>
            <ColorRow
              color={color}
              isOpen={fillColorOpen}
              onSwatchClick={() => (fillColorOpen ? onCloseColor() : onOpenFillColor())}
              onColorChange={onFillColorChange}
            />
          </div>

          {/* ── Stroke color — shapes only ── */}
          {selectedIsShape && strokeColor !== undefined && (
            <>
              <Rule />
              <div className="px-4 pt-3 pb-3">
                <SectionLabel>Stroke</SectionLabel>
                <ColorRow
                  color={strokeColor}
                  isOpen={strokeColorOpen}
                  onSwatchClick={() => (strokeColorOpen ? onCloseColor() : onOpenStrokeColor())}
                  onColorChange={onStrokeColorChange ?? (() => {})}
                />
              </div>
            </>
          )}

          <Rule />

          {/* ── Weight + Opacity ── */}
          <div className="px-4 pt-3 pb-3">
            <SectionLabel>Properties</SectionLabel>
            <div className="flex flex-col gap-4">
              <InlineSlider
                label="Weight"
                value={strokeWeight}
                displayValue={`${strokeWeight}px`}
                min={1}
                max={60}
                onChange={onStrokeWeightChange}
              />
              <InlineSlider
                label="Opacity"
                value={Math.round(opacity * 100)}
                displayValue={`${Math.round(opacity * 100)}%`}
                min={0}
                max={100}
                onChange={(v) => onOpacityChange(v / 100)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
