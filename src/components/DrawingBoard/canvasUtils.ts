import type { Tool, StrokeRecord, FabricMods } from "./types";
import { BG_COLOR } from "./constants";
import type { Rect } from "fabric";

/** Attaches a corner-radius drag handle to a Fabric Rect.
 *  The handle lives at the top-right corner and follows rx visually.
 */
export function applyRectCornerControl(
  rect: Rect,
  mods: Pick<FabricMods, "Control" | "controlsUtils" | "Point">,
) {
  const { Control, controlsUtils, Point } = mods;

  const cornerControl = new Control({
    x: 0.5,
    y: -0.5,
    cursorStyle: "crosshair",
    actionName: "cornerRadius",

    // dim.x = (width * scaleX) / 2, dim.y = (height * scaleY) / 2 — use
    // these directly so the handle stays correct after resizing/scaling.
    positionHandler(dim, finalMatrix, fabricObject) {
      const obj = fabricObject as Rect;
      // rx is in unscaled object-space; convert to screen-space with scaleX
      const rxScaled = (obj.rx ?? 0) * (obj.scaleX ?? 1);
      const clamped  = Math.min(rxScaled, dim.x, dim.y);
      // Top edge, rxScaled pixels inward from the right corner
      return new Point(dim.x - clamped, -dim.y).transform(finalMatrix);
    },

    actionHandler(_ev, transform, x, y) {
      const target = transform.target as Rect;
      // getLocalPoint returns unscaled object-space coords
      const local = controlsUtils.getLocalPoint(
        transform, "center", "center", x, y,
      );
      const maxR = Math.min(target.width ?? 0, target.height ?? 0) / 2;
      const rx    = Math.max(0, Math.min(maxR, (target.width ?? 0) / 2 - local.x));
      target.set({ rx, ry: rx });
      return true;
    },

    render(ctx, left, top) {
      const size = 10;
      ctx.save();
      ctx.beginPath();
      ctx.arc(left, top, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#4f8ef7";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      // mini arc glyph
      ctx.beginPath();
      ctx.arc(left + 1, top + 1, 2.5, Math.PI, Math.PI * 1.5);
      ctx.strokeStyle = "#4f8ef7";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    },
  });

  rect.controls = {
    ...rect.controls,
    cornerRadius: cornerControl,
  };
}

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

  if (tool === "text") {
    if (!stroke.text || points.length === 0) return;
    const fontSize = stroke.fontSize ?? brushSize ?? 20;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(stroke.text, points[0].x, points[0].y);
    ctx.restore();
    return;
  }

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
