import type { ReactNode, CSSProperties } from "react";
import type { ShapeType } from "../../types";
import {
  CircleIcon,
  CursorArrowIcon,
  EraserIcon,
  HeartIcon,
  LineIcon,
  PencilIcon,
  PenIcon,
  SquareIcon,
  StarIcon,
  TextIcon,
  TriangleIcon,
  TVIcon,
  UploadIcon,
} from "../Icons";

export const ICON_SIZE = 25;
export const ICON_PATH_CLASS = "stroke-neutral-800 stroke-1";
export const ICON_FILL_CLASS = "fill-neutral-800";

export const SHAPES_TYPES = ["rect", "circle", "triangle", "star", "heart"];

export const POPOVER_STYLE: CSSProperties = {
  background: "rgba(255,255,255,0.97)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(0,0,0,0.08)",
};

export function makeIcons(size: number = ICON_SIZE, active = false): { type: ShapeType; label: string; icon: ReactNode }[] {
  const strokeClass = active ? ICON_FILL_CLASS : ICON_PATH_CLASS;
  return [
    { type: "select", label: "Select", icon: <CursorArrowIcon width={size} height={size} pathClassName={ICON_FILL_CLASS} /> },
    { type: "text", label: "Text", icon: <TextIcon width={size} height={size} pathClassName={strokeClass} /> },
    { type: "rect", label: "Rectangle", icon: <SquareIcon width={size} height={size} pathClassName={strokeClass} /> },
    { type: "circle", label: "Circle", icon: <CircleIcon width={size} height={size} pathClassName={strokeClass} /> },
    { type: "triangle", label: "Triangle", icon: <TriangleIcon width={size} height={size} pathClassName={strokeClass} /> },
    { type: "star", label: "Star", icon: <StarIcon width={size} height={size} pathClassName={strokeClass} /> },
    { type: "heart", label: "Heart", icon: <HeartIcon width={size} height={size} pathClassName={strokeClass} /> },
    { type: "pencil", label: "Pencil", icon: <PencilIcon width={size} height={size} pathClassName={strokeClass} /> },
    { type: "brush", label: "Pen", icon: <PenIcon width={size} height={size} pathClassName={ICON_FILL_CLASS} /> },
    { type: "line", label: "Line", icon: <LineIcon width={size} height={size} pathClassName={strokeClass} /> },
    { type: "eraser", label: "Eraser", icon: <EraserIcon width={size} height={size} pathClassName={strokeClass} /> },
    { type: "upload", label: "Upload", icon: <UploadIcon width={size} height={size} pathClassName={strokeClass} /> },
    { type: "tv", label: "GIFS", icon: <TVIcon width={size} height={size} pathClassName={strokeClass} /> },
  ];
}
