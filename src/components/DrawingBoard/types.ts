export type Tool = "pencil" | "eraser" | "text";

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
