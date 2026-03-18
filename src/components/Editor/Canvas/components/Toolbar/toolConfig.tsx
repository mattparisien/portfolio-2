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

export const ICON_SIZE_CLASS = "size-[25px]";
/** Padding should stay proportional — update both when changing icon size. 25px icon → p-2 (8px each side) */
export const ICON_BTN_PADDING_CLASS = "p-2";
export const ICON_PATH_CLASS = "stroke-neutral-800 stroke-[0.7]";
export const ICON_FILL_CLASS = "fill-neutral-800";

export const SHAPES_TYPES = ["rect", "circle", "triangle", "star", "heart"];

export const POPOVER_STYLE: CSSProperties = {
  background: "rgba(255,255,255,0.97)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(0,0,0,0.08)",
};

export function makeIcons(sizeClass: string = ICON_SIZE_CLASS, active = false): { type: ShapeType; label: string; icon: ReactNode }[] {
  const strokeClass = active ? ICON_FILL_CLASS : ICON_PATH_CLASS;
  return [
    { type: "select", label: "Select", icon: <CursorArrowIcon svgClassName={`${sizeClass} ${ICON_FILL_CLASS}`} pathClassName={ICON_FILL_CLASS} /> },
    { type: "text", label: "Text", icon: <TextIcon svgClassName={sizeClass} pathClassName={strokeClass} /> },
    { type: "rect", label: "Rectangle", icon: <SquareIcon svgClassName={sizeClass} pathClassName={strokeClass} /> },
    { type: "circle", label: "Circle", icon: <CircleIcon svgClassName={sizeClass} pathClassName={strokeClass} /> },
    { type: "triangle", label: "Triangle", icon: <TriangleIcon svgClassName={sizeClass} pathClassName={strokeClass} /> },
    { type: "star", label: "Star", icon: <StarIcon svgClassName={sizeClass} pathClassName={strokeClass} /> },
    { type: "heart", label: "Heart", icon: <HeartIcon svgClassName={sizeClass} pathClassName={strokeClass} /> },
    { type: "pencil", label: "Pencil", icon: <PencilIcon svgClassName={sizeClass} pathClassName={strokeClass} /> },
    { type: "brush", label: "Pen", icon: <PenIcon svgClassName={`${sizeClass} ${ICON_FILL_CLASS}`} pathClassName={ICON_FILL_CLASS} /> },
    { type: "line", label: "Line", icon: <LineIcon svgClassName={sizeClass} pathClassName={strokeClass} /> },
    { type: "eraser", label: "Eraser", icon: <EraserIcon svgClassName={sizeClass} pathClassName={strokeClass} /> },
    { type: "upload", label: "Upload", icon: <UploadIcon svgClassName={sizeClass} pathClassName={strokeClass} /> },
    { type: "tv", label: "GIFS", icon: <TVIcon svgClassName={sizeClass} pathClassName={strokeClass} /> },
  ];
}
