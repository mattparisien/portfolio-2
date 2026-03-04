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
    // Replay using the same midpoint quadratic bezier technique used when drawing.
    ctx.moveTo(points[0].x, points[0].y);
    let prevMid = { x: points[0].x, y: points[0].y };
    for (let i = 1; i < points.length; i++) {
      const mid = {
        x: (points[i - 1].x + points[i].x) / 2,
        y: (points[i - 1].y + points[i].y) / 2,
      };
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, mid.x, mid.y);
      prevMid = mid;
    }
    // Draw to the final point
    const last = points[points.length - 1];
    ctx.quadraticCurveTo(last.x, last.y, last.x, last.y);
    void prevMid;
    ctx.stroke();
  }
}

/** Clear canvas and redraw the background colour. Always resets the transform
 *  first so the fill covers the entire canvas surface regardless of current zoom. */
export function clearToBackground(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // pixel-space: fill whole canvas
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore(); // restores transform + compositeOperation
}
