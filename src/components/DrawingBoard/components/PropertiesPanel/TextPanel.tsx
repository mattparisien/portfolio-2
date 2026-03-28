"use client";

import {
  MdRemove,
  MdAdd,
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
} from "react-icons/md";
import { FontFamilyPicker } from "../FontFamilyPicker";
import StepButton from "@/components/ui/StepButton";
import ToggleButton from "@/components/ui/ToggleButton";
import Label from "@/components/ui/Label";
import Rule from "@/components/ui/Rule";
import Group from "@/components/ui/Group";
import ColorRow from "./ColorRow";
import AppearanceGroup from "./AppearanceGroup";
import ScrubbableControl from "@/components/ui/ScrubbableControl";
import type { TextProps } from "../../types";

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

export interface TextPanelProps {
  color: string;
  opacity: number;
  onOpacityChange: (v: number) => void;
  textColorOpen: boolean;
  onOpenTextColor: () => void;
  onCloseColor: () => void;
  onTextColorChange: (hex: string) => void;
  textProps: TextProps;
  onApplyText: (updates: Partial<TextProps>) => void;
}

export default function TextPanel({
  color,
  opacity,
  onOpacityChange,
  textColorOpen,
  onOpenTextColor,
  onCloseColor,
  onTextColorChange,
  textProps,
  onApplyText,
}: TextPanelProps) {
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
    <>
      {/* ── Color ── */}
      <Group>
        <Label>Color</Label>
        <ColorRow
          color={gradient ? "#000000" : color}
          isOpen={textColorOpen}
          onSwatchClick={() => {
            if (textColorOpen) onCloseColor();
            else onOpenTextColor();
          }}
          onColorChange={onTextColorChange}
        />
        {gradient && (
          <div className="mt-1 px-1">
            <span className="text-[11px] font-mono font-medium text-black/40">
              Gradient
            </span>
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
              <option key={s} value={s}>
                {s}
              </option>
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

        <div className="flex items-center gap-0.5 mb-2">
          <ToggleButton
            active={bold}
            title="Bold"
            onClick={() => onApplyText({ bold: !bold })}
            style={{ fontWeight: 700 }}
          >
            B
          </ToggleButton>
          <ToggleButton
            active={italic}
            title="Italic"
            onClick={() => onApplyText({ italic: !italic })}
            style={{ fontStyle: "italic" }}
          >
            I
          </ToggleButton>
          <ToggleButton
            active={underline}
            title="Underline"
            onClick={() => onApplyText({ underline: !underline })}
            style={{ textDecoration: "underline" }}
          >
            U
          </ToggleButton>
          <ToggleButton
            active={linethrough}
            title="Strikethrough"
            onClick={() => onApplyText({ linethrough: !linethrough })}
            style={{ textDecoration: "line-through" }}
          >
            S
          </ToggleButton>
          <ToggleButton
            active={uppercase}
            title="All caps"
            onClick={() => onApplyText({ uppercase: !uppercase })}
          >
            <span className="text-[10px] font-bold tracking-wider">AA</span>
          </ToggleButton>
        </div>

        <div className="flex items-center gap-0.5">
          <ToggleButton
            active={textAlign === "left"}
            title="Align left"
            onClick={() => onApplyText({ textAlign: "left" })}
          >
            <MdFormatAlignLeft size={14} />
          </ToggleButton>
          <ToggleButton
            active={textAlign === "center"}
            title="Align center"
            onClick={() => onApplyText({ textAlign: "center" })}
          >
            <MdFormatAlignCenter size={14} />
          </ToggleButton>
          <ToggleButton
            active={textAlign === "right"}
            title="Align right"
            onClick={() => onApplyText({ textAlign: "right" })}
          >
            <MdFormatAlignRight size={14} />
          </ToggleButton>
        </div>
      </Group>

      <Rule />

      {/* ── Spacing ── */}
      <Group>
        <Label>Spacing</Label>
        <div className="flex items-center gap-2">
          <ScrubbableControl
            icon={
              <span className="text-[10px] font-semibold tracking-wide select-none">LH</span>
            }
            value={lineHeight}
            min={0.5}
            max={4}
            step={0.1}
            sensitivity={0.02}
            onChange={(v) => onApplyText({ lineHeight: Math.round(v * 10) / 10 })}
          />
          <ScrubbableControl
            icon={
              <span className="text-[10px] font-semibold tracking-wide select-none">LS</span>
            }
            value={charSpacing}
            min={-200}
            max={1000}
            step={5}
            onChange={(v) => onApplyText({ charSpacing: v })}
          />
        </div>
      </Group>

      <AppearanceGroup opacity={opacity} onOpacityChange={onOpacityChange} />
    </>
  );
}
