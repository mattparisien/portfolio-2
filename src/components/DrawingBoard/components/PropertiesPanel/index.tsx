"use client";

import OverlaySurface from "@/components/OverlaySurface";
import TextPanel from "./TextPanel";
import ImagePanel from "./ImagePanel";
import ObjectPanel from "./ObjectPanel";
import type { TextProps, Tool, TextGradient } from "../../types";

export interface PropertiesPanelProps {
  tool: Tool;
  hasSelection: boolean;
  selectedIsText: boolean;
  selectedIsImage?: boolean;
  selectedIsShape: boolean;
  selectedIsLine: boolean;
  selectedIsPath: boolean;
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
  onFillColorChange: (hex: string) => void;
  onStrokeColorChange?: (hex: string) => void;
  onTextColorChange: (hex: string) => void;
  onRemoveBg?: () => void;
  isRemovingBg?: boolean;
  imageBlendMode?: string;
  onBlendModeChange?: (mode: string) => void;
}

export default function PropertiesPanel({
  tool,
  selectedIsText,
  selectedIsImage,
  selectedIsShape,
  selectedIsLine,
  selectedIsPath,
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
  const fillGradientCss = fillGradient
    ? `linear-gradient(${fillGradient.angle}deg, ${[...fillGradient.stops]
        .sort((a, b) => a.offset - b.offset)
        .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
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
      {selectedIsText || tool === "text" ? (
        <TextPanel
          color={color}
          opacity={opacity}
          onOpacityChange={onOpacityChange}
          textColorOpen={textColorOpen}
          onOpenTextColor={onOpenTextColor}
          onCloseColor={onCloseColor}
          onTextColorChange={onTextColorChange}
          textProps={textProps}
          onApplyText={onApplyText}
        />
      ) : selectedIsImage ? (
        <ImagePanel
          opacity={opacity}
          onOpacityChange={onOpacityChange}
          onRemoveBg={onRemoveBg}
          isRemovingBg={isRemovingBg}
          imageBlendMode={imageBlendMode}
          onBlendModeChange={onBlendModeChange}
        />
      ) : (
        <ObjectPanel
          color={color}
          fillGradientCss={fillGradientCss}
          strokeColor={strokeColor}
          selectedIsShape={selectedIsShape}
          selectedIsLine={selectedIsLine}
          selectedIsPath={selectedIsPath}
          opacity={opacity}
          strokeWeight={strokeWeight}
          fillColorOpen={fillColorOpen}
          strokeColorOpen={strokeColorOpen}
          onOpenFillColor={onOpenFillColor}
          onOpenStrokeColor={onOpenStrokeColor}
          onCloseColor={onCloseColor}
          onFillColorChange={onFillColorChange}
          onStrokeColorChange={onStrokeColorChange}
          onOpacityChange={onOpacityChange}
          onStrokeWeightChange={onStrokeWeightChange}
        />
      )}
    </OverlaySurface>
  );
}
