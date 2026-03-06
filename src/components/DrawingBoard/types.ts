import type { Canvas, PencilBrush, IText, Point as FabricPoint, Rect, Circle, Triangle, Path, FabricImage, ActiveSelection, Gradient } from "fabric";

export type Tool = "pencil" | "brush" | "text" | "shape" | "select" | "eraser";

export type FabricMods = {
  Canvas: typeof Canvas;
  PencilBrush: typeof PencilBrush;
  IText: typeof IText;
  Point: typeof FabricPoint;
  Rect: typeof Rect;
  Circle: typeof Circle;
  Triangle: typeof Triangle;
  Path: typeof Path;
  FabricImage: typeof FabricImage;
  ActiveSelection: typeof ActiveSelection;
  util: (typeof import("fabric"))["util"];
  Gradient: typeof Gradient;
};

export type ShapeType = "rect" | "circle" | "triangle" | "star" | "heart";

export interface Point {
  x: number;
  y: number;
}

export interface TextGradient {
  color1: string;
  color2: string;
}

export interface TextProps {
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  linethrough: boolean;
  uppercase: boolean;
  lineHeight: number;
  charSpacing: number;
  textAlign: "left" | "center" | "right";
  gradient: TextGradient | null;
}

export const DEFAULT_TEXT_PROPS: TextProps = {
  fontFamily: "sans-serif",
  fontSize: 24,
  bold: false,
  italic: false,
  underline: false,
  linethrough: false,
  uppercase: false,
  lineHeight: 1.16,
  charSpacing: 0,
  textAlign: "left",
  gradient: null,
};

export interface StrokeRecord {
  tool: Tool;
  color: string;
  brushSize: number;
  /** Points normalised to 0–1 relative to the viewport at time of recording. */
  points: Point[];
  /** Text content — only set when tool === "text" */
  text?: string;
  /** Font size in px — only set when tool === "text" */
  fontSize?: number;
}
