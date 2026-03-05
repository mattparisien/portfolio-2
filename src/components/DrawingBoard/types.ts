import type { Canvas, PencilBrush, IText, Point as FabricPoint, Rect, Circle, Triangle, Path, FabricImage, Control } from "fabric";

export type Tool = "pencil" | "brush" | "text" | "shape" | "select";

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
  Control: typeof Control;
  controlsUtils: (typeof import("fabric"))["controlsUtils"];
  util: (typeof import("fabric"))["util"];
};

export type ShapeType = "rect" | "circle" | "triangle" | "star" | "heart";

export interface Point {
  x: number;
  y: number;
}

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
