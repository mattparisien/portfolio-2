"use client";

import { MdAutoFixHigh } from "react-icons/md";
import Label from "@/components/ui/Label";
import Rule from "@/components/ui/Rule";
import Group from "@/components/ui/Group";
import AppearanceGroup from "./AppearanceGroup";

export interface ImagePanelProps {
  opacity: number;
  onOpacityChange: (v: number) => void;
  onRemoveBg?: () => void;
  isRemovingBg?: boolean;
  imageBlendMode?: string;
  onBlendModeChange?: (mode: string) => void;
}

export default function ImagePanel({
  opacity,
  onOpacityChange,
  onRemoveBg,
  isRemovingBg,
  imageBlendMode = "source-over",
  onBlendModeChange,
}: ImagePanelProps) {
  return (
    <>
      {/* ── Remove Background ── */}
      <Group>
        <Label>Image</Label>
        <button
          title="Remove background"
          disabled={isRemovingBg}
          onClick={onRemoveBg}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-ui-component text-[12px] font-semibold transition-all duration-150 cursor-pointer"
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

      <AppearanceGroup opacity={opacity} onOpacityChange={onOpacityChange} />

      <Rule />

      {/* ── Blend Mode ── */}
      <Group>
        <Label>Blend Mode</Label>
        <select
          value={imageBlendMode}
          onChange={(e) => onBlendModeChange?.(e.target.value)}
          title="Blend mode"
          className="w-full text-[12px] rounded-ui-component px-2.5 py-1.5 bg-black/[0.04] text-gray-700 font-medium border-0 outline-none cursor-pointer"
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
  );
}
