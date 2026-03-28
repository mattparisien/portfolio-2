"use client";

import InlineSlider from "@/components/ui/InlineSlider";
import Label from "@/components/ui/Label";
import Rule from "@/components/ui/Rule";
import Group from "@/components/ui/Group";
import ScrubbableControl from "@/components/ui/ScrubbableControl";
import { OpacityIcon } from "../Icons";

export interface AppearanceGroupProps {
  opacity: number;
  onOpacityChange: (v: number) => void;
  strokeWeight?: number;
  onStrokeWeightChange?: (v: number) => void;
}

export default function AppearanceGroup({
  opacity,
  onOpacityChange,
  strokeWeight,
  onStrokeWeightChange,
}: AppearanceGroupProps) {
  return (
    <>
      <Rule />
      <Group>
        <Label>Appearance</Label>
        <div className="flex flex-col gap-4">
          {strokeWeight !== undefined && onStrokeWeightChange && (
            <InlineSlider
              label="Weight"
              value={strokeWeight}
              displayValue={`${strokeWeight}px`}
              min={0}
              max={60}
              onChange={onStrokeWeightChange}
            />
          )}
          <ScrubbableControl
            icon={
              <OpacityIcon
                strokeWidth={1}
                height={14}
              />
            }
            value={Math.round(opacity * 100)}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => onOpacityChange(v / 100)}
          />
        </div>
      </Group>
    </>
  );
}
