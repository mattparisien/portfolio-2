import type { Tool, StrokeRecord } from "./types";
import { BG_COLOR } from "./constants";

export function applyCtxStyles(
  ctx: CanvasRenderingContext2D,
  tool: Tool,
  color: string,
  brushSize: number
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation =
    tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = color;
  ctx.lineWidth = brushSize;
}

export function replayStroke(
  ctx: CanvasRenderingContext2D,
  stroke: StrokeRecord
) {
  const { tool, color, brushSize, points } = stroke;
  if (!points || points.length === 0) return;

  applyCtxStyles(ctx, tool, color, brushSize);
  ctx.beginPath();

  if (points.length === 1) {
    const prev = ctx.globalCompositeOperation;
    ctx.arc(points[0].x, points[0].y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === "eraser" ? "rgba(0,0,0,1)" : color;
    ctx.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";
    ctx.fill();
    ctx.globalCompositeOperation = prev;
  } else {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }
}

/** Clear canvas and redraw the background colour. */
export function clearToBackground(ctx: CanvasRenderingContext2D) {
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = prev;
}
