"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { TextProps } from "../types";
import {
  MdRemove,
  MdAdd,
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
  MdFormatLineSpacing,
  MdSpaceBar,
} from "react-icons/md";
import { FontFamilyPicker } from "./FontFamilyPicker";

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
  "Dear Camille",
  "Whimsical Romance Sans",
  "Whimsical Romance Script",
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
  return <div className="h-px w-full my-0.5 bg-black/[0.09] flex-shrink-0" />;
}

function ToggleBtn({
  active,
  title,
  onClick,
  children,
  style,
  ariaLabel,
  ariaPressed,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  ariaLabel?: string;
  ariaPressed?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={ariaLabel ?? title}
      aria-pressed={ariaPressed}
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
      aria-label={title}
      onClick={onClick}
      className="w-6 h-6 rounded-md flex items-center justify-center text-sm font-semibold text-gray-500 hover:bg-black/[0.07] hover:text-gray-900 transition-all duration-150 select-none cursor-pointer flex-shrink-0"
    >
      {children}
    </button>
  );
}

/** Compute a fixed { right, top } position to place a 200-wide popover
 *  to the left of and vertically centered on the given button element. */
function getPopoverPos(btn: HTMLButtonElement | null): React.CSSProperties {
  if (!btn) return {};
  const rect = btn.getBoundingClientRect();
  return {
    right: window.innerWidth - rect.left + 12,
    top: Math.max(8, Math.min(window.innerHeight - 180, rect.top + rect.height / 2 - 90)),
  };
}

export default function TextToolbar({ textProps, color, onApply, closeSignal, onPopoverOpened, colorPopoverOpen, onOpenColorPopover, onCloseColorPopover }: TextToolbarProps) {
  const { fontFamily, fontSize, bold, italic, underline, linethrough, uppercase, lineHeight, charSpacing, textAlign, gradient } = textProps;

  const [lineHeightOpen, setLineHeightOpen] = useState(false);
  const [letterSpacingOpen, setLetterSpacingOpen] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const updateScrollIndicators = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 0);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);

  // Refs for portal-based popovers — needed to position them above their buttons
  // and to handle click-outside dismissal.
  const lineHeightBtnRef = useRef<HTMLButtonElement>(null);
  const lineHeightPopRef = useRef<HTMLDivElement>(null);
  const letterSpacingBtnRef = useRef<HTMLButtonElement>(null);
  const letterSpacingPopRef = useRef<HTMLDivElement>(null);

  // Scroll indicators — update on mount and whenever container size may change
  useEffect(() => {
    updateScrollIndicators();
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollIndicators);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollIndicators]);

  // Close all when a sibling component opens a popover
  useEffect(() => {
    if (!closeSignal) return;
    setLineHeightOpen(false);
    setLetterSpacingOpen(false);
  }, [closeSignal]);

  // Click-outside: close line-height popover
  useEffect(() => {
    if (!lineHeightOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !lineHeightPopRef.current?.contains(e.target as Node) &&
        !lineHeightBtnRef.current?.contains(e.target as Node)
      ) {
        setLineHeightOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [lineHeightOpen]);

  // Click-outside: close letter-spacing popover
  useEffect(() => {
    if (!letterSpacingOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !letterSpacingPopRef.current?.contains(e.target as Node) &&
        !letterSpacingBtnRef.current?.contains(e.target as Node)
      ) {
        setLetterSpacingOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [letterSpacingOpen]);

  // Determine display swatch — gradient pill or solid dot
  const swatchStyle: React.CSSProperties = (() => {
    if (!gradient) return { background: color, borderRadius: "50%", width: 18, height: 18, outline: "1.5px solid rgba(0,0,0,0.15)" };
    const sorted = [...gradient.stops].sort((a, b) => a.offset - b.offset);
    const parts = sorted.map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ");
    return { background: `linear-gradient(${gradient.angle}deg, ${parts})`, borderRadius: 6, width: 28, height: 18 };
  })();

  return (
    <div className="drawing-ui-overlay fixed right-5 top-20 toolbar-enter z-[200]" style={{ maxHeight: "calc(100vh - 120px)" }}>
      {/* Scroll fade — top */}
      {canScrollUp && (
        <div className="absolute top-0 left-0 right-0 h-8 rounded-t-2xl bg-gradient-to-b from-white/90 to-transparent pointer-events-none z-10" />
      )}
      {/* Scroll fade — bottom */}
      {canScrollDown && (
        <div className="absolute bottom-0 left-0 right-0 h-8 rounded-b-2xl bg-gradient-to-t from-white/90 to-transparent pointer-events-none z-10" />
      )}
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollIndicators}
        className="relative flex flex-col items-center gap-1 px-2 py-3 rounded-2xl overflow-y-auto"
        style={{
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid rgba(0,0,0,0.08)",
          scrollbarWidth: "none",
        }}
      >
      {/* ── Color / gradient ── */}
      <div className="relative flex items-center flex-shrink-0">
        <button
          title="Text color"
          aria-label="Text color"
          aria-expanded={!!colorPopoverOpen}
          onClick={(e) => { e.stopPropagation(); colorPopoverOpen ? onCloseColorPopover?.() : onOpenColorPopover?.(); setLineHeightOpen(false); setLetterSpacingOpen(false); }}
          className="w-8 h-8 rounded-ui-component flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105"
          style={{ background: colorPopoverOpen ? "rgba(0,0,0,0.09)" : "transparent" }}
        >
          <span style={swatchStyle} className="flex-shrink-0 block" />
        </button>
      </div>

      {/* ── Font family ── */}
      <div className="flex items-center flex-shrink-0" style={{ minWidth: 100, maxWidth: 130 }}>
        <FontFamilyPicker
          value={fontFamily}
          fonts={FONT_FAMILIES}
          onChange={(f) => onApply({ fontFamily: f })}
        />
      </div>

      <Divider />

      {/* ── Font size ── */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <StepBtn
          title="Decrease font size"
          onClick={() => { const i = FONT_SIZES.indexOf(fontSize); if (i > 0) onApply({ fontSize: FONT_SIZES[i - 1] }); }}
        >
          <MdRemove size={10} />
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
          <MdAdd size={10} />
        </StepBtn>
      </div>

      <Divider />

      {/* ── Style toggles: B I U S AA ── */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <ToggleBtn active={bold} title="Bold" ariaLabel="Bold" ariaPressed={bold} onClick={() => onApply({ bold: !bold })} style={{ fontWeight: 700 }}>B</ToggleBtn>
        <ToggleBtn active={italic} title="Italic" ariaLabel="Italic" ariaPressed={italic} onClick={() => onApply({ italic: !italic })} style={{ fontStyle: "italic" }}>I</ToggleBtn>
        <ToggleBtn active={underline} title="Underline" ariaLabel="Underline" ariaPressed={underline} onClick={() => onApply({ underline: !underline })} style={{ textDecoration: "underline" }}>U</ToggleBtn>
        <ToggleBtn active={linethrough} title="Strikethrough" ariaLabel="Strikethrough" ariaPressed={linethrough} onClick={() => onApply({ linethrough: !linethrough })} style={{ textDecoration: "line-through" }}>S</ToggleBtn>
        <ToggleBtn active={uppercase} title="All caps" ariaLabel="Uppercase" ariaPressed={uppercase} onClick={() => onApply({ uppercase: !uppercase })}>
          <span className="text-xs font-bold tracking-wider">AA</span>
        </ToggleBtn>
      </div>

      <Divider />

      {/* ── Text alignment ── */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <ToggleBtn active={textAlign === "left"} title="Align left" ariaLabel="Align left" ariaPressed={textAlign === "left"} onClick={() => onApply({ textAlign: "left" })}>
          <MdFormatAlignLeft size={13} />
        </ToggleBtn>
        <ToggleBtn active={textAlign === "center"} title="Align center" ariaLabel="Align center" ariaPressed={textAlign === "center"} onClick={() => onApply({ textAlign: "center" })}>
          <MdFormatAlignCenter size={13} />
        </ToggleBtn>
        <ToggleBtn active={textAlign === "right"} title="Align right" ariaLabel="Align right" ariaPressed={textAlign === "right"} onClick={() => onApply({ textAlign: "right" })}>
          <MdFormatAlignRight size={13} />
        </ToggleBtn>
      </div>

      <Divider />

      {/* ── Line height ── */}
      <div className="relative flex items-center flex-shrink-0">
        <button
          ref={lineHeightBtnRef}
          title="Line height"
          aria-label="Line height"
          aria-expanded={lineHeightOpen}
          onClick={(e) => { e.stopPropagation(); setLineHeightOpen((v) => !v); setLetterSpacingOpen(false); onCloseColorPopover?.(); onPopoverOpened?.(); }}
          className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 select-none ${lineHeightOpen ? "bg-black/[0.09]" : "hover:bg-black/[0.07]"}`}
        >
          <MdFormatLineSpacing size={14} className="text-gray-600" />
        </button>
        {lineHeightOpen && createPortal(
          <div
            ref={lineHeightPopRef}
            className="fixed px-4 pt-3.5 pb-4 rounded-2xl popover-enter"
            style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              width: 200,
              border: "1px solid rgba(0,0,0,0.07)",
              zIndex: 300,
              ...getPopoverPos(lineHeightBtnRef.current),
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
          </div>,
          document.body
        )}
      </div>

      <Divider />

      {/* ── Letter spacing ── */}
      <div className="relative flex items-center flex-shrink-0">
        <button
          ref={letterSpacingBtnRef}
          title="Letter spacing"
          aria-label="Letter spacing"
          aria-expanded={letterSpacingOpen}
          onClick={(e) => { e.stopPropagation(); setLetterSpacingOpen((v) => !v); setLineHeightOpen(false); onCloseColorPopover?.(); onPopoverOpened?.(); }}
          className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 select-none ${letterSpacingOpen ? "bg-black/[0.09]" : "hover:bg-black/[0.07]"}`}
        >
          <MdSpaceBar size={14} className="text-gray-600" />
        </button>
        {letterSpacingOpen && createPortal(
          <div
            ref={letterSpacingPopRef}
            className="fixed px-4 pt-3.5 pb-4 rounded-2xl popover-enter"
            style={{
              background: "rgba(255,255,255,0.98)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              width: 200,
              border: "1px solid rgba(0,0,0,0.07)",
              zIndex: 300,
              ...getPopoverPos(letterSpacingBtnRef.current),
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
          </div>,
          document.body
        )}
      </div>
      </div>
    </div>
  );
}
