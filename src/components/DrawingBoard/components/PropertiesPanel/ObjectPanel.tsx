"use client";

import Label from "@/components/ui/Label";
import Rule from "@/components/ui/Rule";
import Group from "@/components/ui/Group";
import ScrubbableControl from "@/components/ui/ScrubbableControl";
import { StrokeWeightIcon } from "../Icons";
import ColorOpacityRow from "./ColorOpacityRow";
import AppearanceGroup from "./AppearanceGroup";

export interface ObjectPanelProps {
  color: string;
  fillGradientCss?: string;
  strokeColor?: string;
  selectedIsShape: boolean;
  selectedIsLine: boolean;
  selectedIsPath: boolean;
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
  selectedIsPath,
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
      {/* ── Fill / Stroke color + weight ── */}
      <Group>
        <Label>{(selectedIsLine || selectedIsPath) ? "Stroke" : "Fill"}</Label>
        <div className="flex flex-col gap-2">
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
          <div className="w-1/2">
            <ScrubbableControl
              icon={<StrokeWeightIcon width={18} height={18} strokeWidth={1.5} />}
              value={strokeWeight}
              min={1}
              max={60}
              step={1}
              unit="px"
              onChange={onStrokeWeightChange}
            />
          </div>
        </div>
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
        onStrokeWeightChange={onStrokeWeightChange}
      />
    </>
  );
}
