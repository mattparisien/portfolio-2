"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { TextProps, Tool, TextGradient } from "../types";
import {
  MdRemove,
  MdAdd,
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
} from "react-icons/md";
import OverlaySurface from "@/components/OverlaySurface";
import { LockClosedIcon, LockOpenIcon, TrashIcon, StrokeWeightIcon, TransparencyIcon } from "./Icons";

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

export interface PropertyToolbarProps {
  tool: Tool;
  hasSelection: boolean;
  selectedIsText: boolean;
  selectedIsShape: boolean;
  selectedIsLine: boolean;
  selectedIsImage: boolean;
  color: string;
  fillGradient?: TextGradient | null;
  strokeColor?: string;
  opacity: number;
  strokeWeight: number;
  textProps: TextProps;
  onOpacityChange: (v: number) => void;
  onStrokeWeightChange: (v: number) => void;
  onApplyText: (updates: Partial<TextProps>) => void;
  fillColorOpen: boolean;
  strokeColorOpen: boolean;
  textColorOpen: boolean;
  onOpenFillColor: () => void;
  onOpenStrokeColor: () => void;
  onOpenTextColor: () => void;
  onCloseColor: () => void;
  locked?: boolean;
  onToggleLock?: () => void;
  onDelete?: () => void;
  isRemovingBg?: boolean;
  bgAlreadyRemoved?: boolean;
  onRemoveBg?: () => void;
}

// ── Primitives ────────────────────────────────────────────────────────────────

const SWATCH_SHADOW = "0 0 0 1.5px rgba(0,0,0,0.14), 0 0 0 3px #fff, 0 0 0 4.5px rgba(0,0,0,0.07)";

function VDivider() {
  return <div className="w-px h-5 bg-black/[0.09] flex-shrink-0 mx-1" />;
}

function ColorSwatch({
  color,
  isOpen,
  onClick,
  gradientCss,
  title,
}: {
  color: string;
  isOpen: boolean;
  onClick: () => void;
  gradientCss?: string;
  title: string;
}) {
  return (
    <button
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="flex-shrink-0 rounded-full cursor-pointer transition-transform hover:scale-110 active:scale-95"
      style={{
        width: 20,
        height: 20,
        background: gradientCss ?? color,
        boxShadow: isOpen ? "0 0 0 2px #fff, 0 0 0 4px #000" : SWATCH_SHADOW,
      }}
    />
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
      className={`w-7 h-7 rounded-md flex items-center justify-center text-sm transition-all duration-150 select-none cursor-pointer flex-shrink-0 ${
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
      className="w-6 h-6 rounded-md bg-black/[0.04] hover:bg-black/[0.09] flex items-center justify-center text-gray-500 transition-colors cursor-pointer flex-shrink-0"
    >
      {children}
    </button>
  );
}

function popoverPos(btn: HTMLButtonElement | null): React.CSSProperties {
  if (!btn) return {};
  const r = btn.getBoundingClientRect();
  return {
    top: r.bottom + 8,
    left: Math.max(8, r.left + r.width / 2 - 100),
  };
}

function OpacityButton({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pct = Math.round(value * 100);
  return (
    <div className="relative flex-shrink-0">
      <button
        ref={btnRef}
        title={`Opacity: ${pct}%`}
        onClick={() => setOpen((o) => !o)}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
          open ? "bg-black text-white" : "hover:bg-black/[0.07] text-gray-700"
        }`}
      >
        <TransparencyIcon width={16} height={16} />
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[360]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[370] px-4 pt-3.5 pb-4 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              width: 200,
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              ...popoverPos(btnRef.current),
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 select-none">Opacity</span>
              <span className="text-sm font-semibold text-gray-800 tabular-nums">{pct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={pct}
              onChange={(e) => onChange(Number(e.target.value) / 100)}
              className="w-full cursor-pointer"
              style={{
                accentColor: "#111",
                background: `linear-gradient(to right, #111 ${pct}%, #e0e0e0 ${pct}%)`,
              }}
            />
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

function strokeWeightPopoverPos(btn: HTMLButtonElement | null): React.CSSProperties {
  return popoverPos(btn);
}

function StrokeWeightButton({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="relative flex-shrink-0">
      <button
        ref={btnRef}
        title={`Stroke weight: ${value}px`}
        onClick={() => setOpen((o) => !o)}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
          open ? "bg-black text-white" : "hover:bg-black/[0.07] text-gray-700"
        }`}
      >
        <StrokeWeightIcon width={16} height={16} />
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[360]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[370] px-4 pt-3.5 pb-4 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              width: 200,
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              ...strokeWeightPopoverPos(btnRef.current),
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 select-none">Stroke Weight</span>
              <span className="text-sm font-semibold text-gray-800 tabular-nums">{value}px</span>
            </div>
            <div className="flex items-center justify-center h-5 mb-3">
              <div
                className="rounded-full bg-black/80"
                style={{
                  width: Math.min(value * 2.5 + 20, 152),
                  height: Math.max(1.5, Math.min(value, 16)),
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="w-full cursor-pointer"
              style={{
                accentColor: "#111",
                background: `linear-gradient(to right, #111 ${((value - 1) / 59) * 100}%, #e0e0e0 ${((value - 1) / 59) * 100}%)`,
              }}
            />
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
  suffix,
  title,
  width,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  title?: string;
  width?: number;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => { setLocal(String(value)); }, [value]);
  return (
    <div className="relative flex items-center flex-shrink-0" style={{ width: width ?? 52 }}>
      <input
        type="number"
        title={title}
        value={local}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => {
          setLocal(e.target.value);
          const n = Number(e.target.value);
          if (!isNaN(n) && n >= min && n <= max) onChange(n);
        }}
        onBlur={() => setLocal(String(value))}
        className="w-full text-[11px] font-semibold tabular-nums text-black/70 bg-black/[0.04] rounded-md px-2 py-1 border-0 outline-none focus:bg-black/[0.08] transition-colors text-center"
      />
      {suffix && (
        <span className="absolute right-1.5 text-[10px] text-black/30 pointer-events-none">{suffix}</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PropertyToolbar({
  tool,
  hasSelection,
  selectedIsText,
  selectedIsShape,
  selectedIsLine,
  selectedIsImage,
  color,
  fillGradient,
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
  locked,
  onToggleLock,
  onDelete,
  isRemovingBg,
  bgAlreadyRemoved,
  onRemoveBg,
}: PropertyToolbarProps) {
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

  const fillGradientCss = fillGradient
    ? `linear-gradient(${fillGradient.angle}deg, ${[...fillGradient.stops]
        .sort((a, b) => a.offset - b.offset)
        .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
        .join(", ")})`
    : undefined;

  const isTextMode  = selectedIsText || tool === "text";
  const isImageMode = selectedIsImage;

  return (
    <OverlaySurface
      rounded
      borderBottom
      borderTop
      borderLeft
      borderRight
      className="fixed top-appBounds left-1/2 -translate-x-1/2 flex items-center h-11 px-3 gap-1.5 z-[350] overflow-x-auto max-w-[calc(100vw-32px)]"
      style={{ scrollbarWidth: "none" }}
    >
      {isTextMode ? (
        /* ══════════════ TEXT ══════════════ */
        <>
          {/* Color */}
          <ColorSwatch
            title="Text colour"
            color={gradient ? "#000000" : color}
            isOpen={textColorOpen}
            onClick={() => (textColorOpen ? onCloseColor() : onOpenTextColor())}
          />

          <VDivider />

          {/* Font family */}
          <select
            value={fontFamily}
            onChange={(e) => onApplyText({ fontFamily: e.target.value })}
            title="Font family"
            className="text-[11px] rounded-md px-1.5 py-1 bg-black/[0.04] text-gray-700 font-medium border-0 outline-none cursor-pointer flex-shrink-0 max-w-[110px]"
            style={{ fontFamily }}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </option>
            ))}
          </select>

          {/* Font size */}
          <StepBtn
            title="Decrease font size"
            onClick={() => {
              const i = FONT_SIZES.indexOf(fontSize);
              if (i > 0) onApplyText({ fontSize: FONT_SIZES[i - 1] });
            }}
          >
            <MdRemove size={10} />
          </StepBtn>
          <select
            value={fontSize}
            onChange={(e) => onApplyText({ fontSize: Number(e.target.value) })}
            title="Font size"
            className="w-12 text-[11px] rounded-md px-1 py-1 bg-black/[0.04] cursor-pointer outline-none text-gray-700 font-semibold tabular-nums text-center border-0 flex-shrink-0"
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <StepBtn
            title="Increase font size"
            onClick={() => {
              const i = FONT_SIZES.indexOf(fontSize);
              if (i < FONT_SIZES.length - 1) onApplyText({ fontSize: FONT_SIZES[i + 1] });
            }}
          >
            <MdAdd size={10} />
          </StepBtn>

          <VDivider />

          {/* Style: B I U S AA */}
          <ToggleBtn active={bold} title="Bold" onClick={() => onApplyText({ bold: !bold })} style={{ fontWeight: 700 }}>B</ToggleBtn>
          <ToggleBtn active={italic} title="Italic" onClick={() => onApplyText({ italic: !italic })} style={{ fontStyle: "italic" }}>I</ToggleBtn>
          <ToggleBtn active={underline} title="Underline" onClick={() => onApplyText({ underline: !underline })} style={{ textDecoration: "underline" }}>U</ToggleBtn>
          <ToggleBtn active={linethrough} title="Strikethrough" onClick={() => onApplyText({ linethrough: !linethrough })} style={{ textDecoration: "line-through" }}>S</ToggleBtn>
          <ToggleBtn active={uppercase} title="All caps" onClick={() => onApplyText({ uppercase: !uppercase })}>
            <span className="text-[9px] font-bold tracking-wider">AA</span>
          </ToggleBtn>

          <VDivider />

          {/* Alignment */}
          <ToggleBtn active={textAlign === "left"} title="Align left" onClick={() => onApplyText({ textAlign: "left" })}>
            <MdFormatAlignLeft size={13} />
          </ToggleBtn>
          <ToggleBtn active={textAlign === "center"} title="Align center" onClick={() => onApplyText({ textAlign: "center" })}>
            <MdFormatAlignCenter size={13} />
          </ToggleBtn>
          <ToggleBtn active={textAlign === "right"} title="Align right" onClick={() => onApplyText({ textAlign: "right" })}>
            <MdFormatAlignRight size={13} />
          </ToggleBtn>

          <VDivider />

          {/* Spacing */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-black/40 select-none">LH</span>
            <NumberInput
              title="Line height"
              value={Math.round(lineHeight * 10) / 10}
              min={0.5}
              max={4}
              step={0.1}
              onChange={(v) => onApplyText({ lineHeight: Math.round(v * 10) / 10 })}
              width={44}
            />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-black/40 select-none">LS</span>
            <NumberInput
              title="Letter spacing"
              value={charSpacing}
              min={-200}
              max={1000}
              step={5}
              onChange={(v) => onApplyText({ charSpacing: v })}
              width={52}
            />
          </div>

          <VDivider />

          {/* Opacity */}
          <OpacityButton value={opacity} onChange={onOpacityChange} />

          {/* Lock / Delete — only when an object is actually selected */}
          {hasSelection && onToggleLock && (
            <>
              <VDivider />
              <ToggleBtn
                active={!!locked}
                title={locked ? "Unlock object" : "Lock object"}
                onClick={onToggleLock}
              >
                {locked
                  ? <LockClosedIcon width={13} height={13} pathClassName="stroke-current stroke-1" />
                  : <LockOpenIcon   width={13} height={13} pathClassName="stroke-current stroke-1" />}
              </ToggleBtn>
              {!locked && onDelete && (
                <ToggleBtn active={false} title="Delete object" onClick={onDelete}>
                  <TrashIcon width={13} height={13} pathClassName="stroke-current stroke-1" />
                </ToggleBtn>
              )}
            </>
          )}
        </>
      ) : isImageMode ? (
        /* ══════════════ IMAGE ══════════════ */
        <>
          {/* Opacity */}
          <OpacityButton value={opacity} onChange={onOpacityChange} />

          {/* Remove background */}
          {onRemoveBg && (
            <>
              <VDivider />
              <button
                title="Remove background"
                onClick={onRemoveBg}
                disabled={isRemovingBg || bgAlreadyRemoved}
                className={`flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${bgAlreadyRemoved ? "bg-black/[0.04] text-black/30 cursor-default" : "cursor-pointer bg-black/[0.06] hover:bg-black/[0.12] text-gray-700"}`}
              >
                {isRemovingBg ? "Removing…" : bgAlreadyRemoved ? "BG Removed" : "Remove BG"}
              </button>
            </>
          )}

          {/* Lock / Delete */}
          {hasSelection && onToggleLock && (
            <>
              <VDivider />
              <ToggleBtn
                active={!!locked}
                title={locked ? "Unlock object" : "Lock object"}
                onClick={onToggleLock}
              >
                {locked
                  ? <LockClosedIcon width={13} height={13} pathClassName="stroke-current stroke-1" />
                  : <LockOpenIcon   width={13} height={13} pathClassName="stroke-current stroke-1" />}
              </ToggleBtn>
              {!locked && onDelete && (
                <ToggleBtn active={false} title="Delete object" onClick={onDelete}>
                  <TrashIcon width={13} height={13} pathClassName="stroke-current stroke-1" />
                </ToggleBtn>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {/* Fill color (or stroke-only label for lines) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ColorSwatch
              title={selectedIsLine ? "Stroke colour" : "Fill colour"}
              color={color}
              gradientCss={selectedIsLine ? undefined : fillGradientCss}
              isOpen={fillColorOpen}
              onClick={() => (fillColorOpen ? onCloseColor() : onOpenFillColor())}
            />
          </div>

          {/* Stroke color — shapes only */}
          {selectedIsShape && strokeColor !== undefined && (
            <>
              <VDivider />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-black/40 select-none">Stroke</span>
                <ColorSwatch
                  title="Stroke colour"
                  color={strokeColor}
                  isOpen={strokeColorOpen}
                  onClick={() => (strokeColorOpen ? onCloseColor() : onOpenStrokeColor())}
                />
              </div>
            </>
          )}

          <VDivider />

          {/* Weight */}
          <StrokeWeightButton value={strokeWeight} onChange={onStrokeWeightChange} />

          <VDivider />

          {/* Opacity */}
          <OpacityButton value={opacity} onChange={onOpacityChange} />

          {/* Lock / Delete — only when an object is actually selected */}
          {hasSelection && onToggleLock && (
            <>
              <VDivider />
              <ToggleBtn
                active={!!locked}
                title={locked ? "Unlock object" : "Lock object"}
                onClick={onToggleLock}
              >
                {locked
                  ? <LockClosedIcon width={13} height={13} pathClassName="stroke-current stroke-1" />
                  : <LockOpenIcon   width={13} height={13} pathClassName="stroke-current stroke-1" />}
              </ToggleBtn>
              {!locked && onDelete && (
                <ToggleBtn active={false} title="Delete object" onClick={onDelete}>
                  <TrashIcon width={13} height={13} pathClassName="stroke-current stroke-1" />
                </ToggleBtn>
              )}
            </>
          )}
        </>
      )}
    </OverlaySurface>
  );
}
