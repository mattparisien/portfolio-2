"use client";

import Label from "@/components/ui/Label";
import Rule from "@/components/ui/Rule";
import Group from "@/components/ui/Group";
import ColorOpacityRow from "./ColorOpacityRow";
import AppearanceGroup from "./AppearanceGroup";

export interface ObjectPanelProps {
  color: string;
  fillGradientCss?: string;
  strokeColor?: string;
  selectedIsShape: boolean;
  selectedIsLine: boolean;
  opacity: number;
  strokeWeight: number;
  fillColorOpen: boolean;
  strokeColorOpen: boolean;
  onOpenFillColor: () => void;
  onOpenStrokeColor: () => void;
  onCloseColor: () => void;
  onFillColorChange: (hex: string) => void;
  onStrokeColorChange?: (hex: string) => void;
  onOpacityChange: (v: number) => void;
  onStrokeWeightChange: (v: number) => void;
}

export default function ObjectPanel({
  color,
  fillGradientCss,
  strokeColor,
  selectedIsShape,
  selectedIsLine,
  opacity,
  strokeWeight,
  fillColorOpen,
  strokeColorOpen,
  onOpenFillColor,
  onOpenStrokeColor,
  onCloseColor,
  onFillColorChange,
  onStrokeColorChange,
  onOpacityChange,
  onStrokeWeightChange,
}: ObjectPanelProps) {
  return (
    <>
      {/* ── Fill / Stroke color ── */}
      <Group>
        <Label>{selectedIsLine ? "Stroke" : "Fill"}</Label>
        <ColorOpacityRow
          color={color}
          gradientCss={selectedIsLine ? undefined : fillGradientCss}
          opacity={Math.round(opacity * 100)}
          isOpen={fillColorOpen}
          onSwatchClick={() =>
            fillColorOpen ? onCloseColor() : onOpenFillColor()
          }
          onColorChange={onFillColorChange}
          onOpacityChange={(v) => onOpacityChange(v / 100)}
        />
      </Group>

      {/* ── Stroke color — shapes only ── */}
      {selectedIsShape && strokeColor !== undefined && (
        <>
          <Rule />
          <Group>
            <Label>Stroke</Label>
            <ColorOpacityRow
              color={strokeColor}
              opacity={Math.round(opacity * 100)}
              isOpen={strokeColorOpen}
              onSwatchClick={() =>
                strokeColorOpen ? onCloseColor() : onOpenStrokeColor()
              }
              onColorChange={onStrokeColorChange ?? (() => {})}
              onOpacityChange={(v) => onOpacityChange(v / 100)}
            />
          </Group>
        </>
      )}

      <AppearanceGroup
        strokeWeight={strokeWeight}
        onStrokeWeightChange={onStrokeWeightChange}
      />
    </>
  );
}
