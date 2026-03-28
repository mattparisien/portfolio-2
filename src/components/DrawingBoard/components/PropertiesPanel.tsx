"use client";

import { useState, useEffect } from "react";
import type { TextProps, Tool, TextGradient } from "../types";
import {
  MdRemove,
  MdAdd,
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
  MdAutoFixHigh,
} from "react-icons/md";
import OverlaySurface from "@/components/OverlaySurface";
import { FontFamilyPicker } from "./FontFamilyPicker";
import StepButton from "@/components/ui/StepButton";
import ToggleButton from "@/components/ui/ToggleButton";
import InlineSlider from "@/components/ui/InlineSlider";
import Label from "@/components/ui/Label";
import Rule from "@/components/ui/Rule";
import Group from "@/components/ui/Group";

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

export interface PropertiesPanelProps {
  tool: Tool;
  hasSelection: boolean;
  selectedIsText: boolean;
  selectedIsImage?: boolean;
  selectedIsShape: boolean;
  selectedIsLine: boolean;
  /** Fill / drawing color */
  color: string;
  /** Active gradient for the fill swatch (non-text objects) */
  fillGradient?: TextGradient | null;
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
  onRemoveBg?: () => void;
  isRemovingBg?: boolean;
  imageBlendMode?: string;
  onBlendModeChange?: (mode: string) => void;
}




const SWATCH_SHADOW =
  "0 0 0 1.5px rgba(0,0,0,0.14), 0 0 0 3.5px #fff, 0 0 0 5px rgba(0,0,0,0.07)";

function ColorRow({
  color,
  isOpen,
  onSwatchClick,
  onColorChange,
  gradientCss,
}: {
  color: string;
  isOpen: boolean;
  onSwatchClick: () => void;
  onColorChange: (hex: string) => void;
  gradientCss?: string;
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
          background: gradientCss ?? color,
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




// ── Main component ─────────────────────────────────────────────────────────

export default function PropertiesPanel({
  tool,
  selectedIsText,
  selectedIsImage,
  selectedIsShape,
  selectedIsLine,
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
  onFillColorChange,
  onStrokeColorChange,
  onTextColorChange,
  onRemoveBg,
  isRemovingBg,
  imageBlendMode = "source-over",
  onBlendModeChange,
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

  // Compute a CSS gradient string for the fill swatch when a gradient is active
  const fillGradientCss = fillGradient
    ? `linear-gradient(${fillGradient.angle}deg, ${[...fillGradient.stops]
      .sort((a, b) => a.offset - b.offset)
      .map(s => `${s.color} ${Math.round(s.offset * 100)}%`)
      .join(", ")})`
    : undefined;

  return (
    <OverlaySurface
      borderLeft
      className="fixed right-0 top-0 h-screen w-[220px] flex flex-col overflow-y-auto"
      style={{
        paddingTop: 76,
        paddingBottom: 88,
        scrollbarWidth: "none",
      }}
    >

      {(selectedIsText || tool === "text") ? (
        /* ═══════════════════ TEXT VIEW ═══════════════════ */
        <>
          {/* ── Color ── */}
          <Group>
            <Label>Color</Label>
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
          </Group>
          <Rule />

          {/* ── Font ── */}
            <Group>
            <Label>Font</Label>

            <div className="rounded-lg bg-black/[0.04] mb-2.5">
              <FontFamilyPicker
                value={fontFamily}
                fonts={FONT_FAMILIES}
                onChange={(f) => onApplyText({ fontFamily: f })}
                variant="full"
              />
            </div>

            {/* Font size stepper */}
            <div className="flex items-center gap-1.5">
              <StepButton
                title="Decrease font size"
                onClick={() => {
                  const i = FONT_SIZES.indexOf(fontSize);
                  if (i > 0) onApplyText({ fontSize: FONT_SIZES[i - 1] });
                }}
              >
                <MdRemove size={11} />
              </StepButton>
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
              <StepButton
                title="Increase font size"
                onClick={() => {
                  const i = FONT_SIZES.indexOf(fontSize);
                  if (i < FONT_SIZES.length - 1)
                    onApplyText({ fontSize: FONT_SIZES[i + 1] });
                }}
              >
                <MdAdd size={11} />
              </StepButton>
            </div>
          </Group>

          <Rule />

          {/* ── Style ── */}
          <Group>
            <Label>Style</Label>

            {/* B I U S AA — all in one row */}
            <div className="flex items-center gap-0.5 mb-2">
              <ToggleButton active={bold} title="Bold" onClick={() => onApplyText({ bold: !bold })} style={{ fontWeight: 700 }}>B</ToggleButton>
              <ToggleButton active={italic} title="Italic" onClick={() => onApplyText({ italic: !italic })} style={{ fontStyle: "italic" }}>I</ToggleButton>
              <ToggleButton active={underline} title="Underline" onClick={() => onApplyText({ underline: !underline })} style={{ textDecoration: "underline" }}>U</ToggleButton>
              <ToggleButton active={linethrough} title="Strikethrough" onClick={() => onApplyText({ linethrough: !linethrough })} style={{ textDecoration: "line-through" }}>S</ToggleButton>
              <ToggleButton active={uppercase} title="All caps" onClick={() => onApplyText({ uppercase: !uppercase })}>
                <span className="text-[10px] font-bold tracking-wider">AA</span>
              </ToggleButton>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-0.5">
              <ToggleButton active={textAlign === "left"} title="Align left" onClick={() => onApplyText({ textAlign: "left" })}>
                <MdFormatAlignLeft size={14} />
              </ToggleButton>
              <ToggleButton active={textAlign === "center"} title="Align center" onClick={() => onApplyText({ textAlign: "center" })}>
                <MdFormatAlignCenter size={14} />
              </ToggleButton>
              <ToggleButton active={textAlign === "right"} title="Align right" onClick={() => onApplyText({ textAlign: "right" })}>
                <MdFormatAlignRight size={14} />
              </ToggleButton>
            </div>
          </Group>

          <Rule />

          {/* ── Spacing ── */}
          <Group>
            <Label>Spacing</Label>
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
          </Group>
        </>
      ) : selectedIsImage ? (
        /* ═════════════════════ IMAGE VIEW ═════════════════════ */
        <>
          {/* ── Remove Background ── */}
          <Group>
            <Label>Image</Label>
            <button
              title="Remove background"
              disabled={isRemovingBg}
              onClick={onRemoveBg}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150 cursor-pointer"
              style={{
                background: isRemovingBg ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.07)",
                color: isRemovingBg ? "#999" : "#222",
                opacity: isRemovingBg ? 0.6 : 1,
              }}
            >
              <MdAutoFixHigh size={14} />
              {isRemovingBg ? "Removing…" : "Remove Background"}
            </button>
          </Group>

          <Rule />

          {/* ── Opacity ── */}
          <Group>
            <Label>Properties</Label>
            <InlineSlider
              label="Opacity"
              value={Math.round(opacity * 100)}
              displayValue={`${Math.round(opacity * 100)}%`}
              min={0}
              max={100}
              onChange={(v) => onOpacityChange(v / 100)}
            />
          </Group>

          <Rule />

          {/* ── Blend Mode ── */}
          <Group>
            <Label>Blend Mode</Label>
            <select
              value={imageBlendMode}
              onChange={(e) => onBlendModeChange?.(e.target.value)}
              title="Blend mode"
              className="w-full text-[12px] rounded-lg px-2.5 py-1.5 bg-black/[0.04] text-gray-700 font-medium border-0 outline-none cursor-pointer"
            >
              <option value="source-over">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
              <option value="overlay">Overlay</option>
              <option value="darken">Darken</option>
              <option value="lighten">Lighten</option>
              <option value="color-dodge">Color Dodge</option>
              <option value="color-burn">Color Burn</option>
              <option value="hard-light">Hard Light</option>
              <option value="soft-light">Soft Light</option>
              <option value="difference">Difference</option>
              <option value="exclusion">Exclusion</option>
              <option value="hue">Hue</option>
              <option value="saturation">Saturation</option>
              <option value="color">Color</option>
              <option value="luminosity">Luminosity</option>
            </select>
          </Group>
        </>
      ) : (
        /* ═══════════════════ OBJECT / DRAWING VIEW ═══════════════════ */
        <>
          {/* ── Fill / Stroke color ── */}
          <Group>
            <Label>{selectedIsLine ? "Stroke" : "Fill"}</Label>
            <ColorRow
              color={color}
              gradientCss={selectedIsLine ? undefined : fillGradientCss}
              isOpen={fillColorOpen}
              onSwatchClick={() => (fillColorOpen ? onCloseColor() : onOpenFillColor())}
              onColorChange={onFillColorChange}
            />
          </Group>

          {/* ── Stroke color — shapes only ── */}
          {selectedIsShape && strokeColor !== undefined && (
            <>
              <Rule />
              <Group>
                <Label>Stroke</Label>
                <ColorRow
                  color={strokeColor}
                  isOpen={strokeColorOpen}
                  onSwatchClick={() => (strokeColorOpen ? onCloseColor() : onOpenStrokeColor())}
                  onColorChange={onStrokeColorChange ?? (() => { })}
                />
              </Group>
            </>
          )}

          <Rule />

          {/* ── Weight + Opacity ── */}
          <Group>
            <Label>Properties</Label>
            <div className="flex flex-col gap-4">
              <InlineSlider
                label="Weight"
                value={strokeWeight}
                displayValue={`${strokeWeight}px`}
                min={0}
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
          </Group>
        </>
      )}
    </OverlaySurface>
  );
}
