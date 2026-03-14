import type { ReactNode, CSSProperties } from "react";
import type { ShapeType } from "../../types";
import {
  CircleIcon,
  EraserIcon,
  HeartIcon,
  LineIcon,
  PencilIcon,
  PenIcon,
  SelectIcon,
  SquareIcon,
  StarIcon,
  TextIcon,
  TriangleIcon,
  TVIcon,
  UploadIcon,
} from "../Icons";

export const ICON_SIZE = 17;
export const ICON_STROKE_WIDTH = 1;
export const ICON_COLOR = "black";
export const ICON_COLOR_ACTIVE = "white";

export const SHAPES_TYPES = ["rect", "circle", "triangle", "star", "heart"];

export const POPOVER_STYLE: CSSProperties = {
  background: "rgba(255,255,255,0.97)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(0,0,0,0.08)",
};

export function makeIcons(color: string): { type: ShapeType; label: string; icon: ReactNode }[] {
  return [
    { type: "select", label: "Select", icon: <SelectIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
    { type: "text", label: "Text", icon: <TextIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
    { type: "rect", label: "Rectangle", icon: <SquareIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
    { type: "circle", label: "Circle", icon: <CircleIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
    { type: "triangle", label: "Triangle", icon: <TriangleIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
    { type: "star", label: "Star", icon: <StarIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
    { type: "heart", label: "Heart", icon: <HeartIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
    { type: "pencil", label: "Pencil", icon: <PencilIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
    { type: "brush", label: "Brush", icon: <PenIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
    { type: "line", label: "Line", icon: <LineIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
    { type: "eraser", label: "Eraser", icon: <EraserIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
    { type: "upload", label: "Upload", icon: <UploadIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
    { type: "tv", label: "GIFS", icon: <TVIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
  ];
}
