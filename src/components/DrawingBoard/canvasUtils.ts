import type { Tool, StrokeRecord, TextGradient, FabricMods } from "./types";

export function getCanvasBgColor(): string {
  const el = document.createElement("div");
  el.style.backgroundColor = "var(--color-canvas-bg)";
  document.body.appendChild(el);
  const resolved = getComputedStyle(el).backgroundColor;
  document.body.removeChild(el);
  return resolved || "#F6F6F6";
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
  ctx.fillStyle = getCanvasBgColor();
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore(); // restores transform + compositeOperation
}

// ── Gradient angle → normalised linear-gradient coords (0–1 range) ─────────
/** Converts a CSS-style angle in degrees to Fabric.js percentage-unit
 *  gradient coords (x1/y1 start → x2/y2 end). */
export function gradientCoordsFromAngle(angle: number) {
  const rad = (angle * Math.PI) / 180;
  const dx  = Math.sin(rad);
  const dy  = -Math.cos(rad);
  return {
    x1: 0.5 - dx * 0.5,
    y1: 0.5 - dy * 0.5,
    x2: 0.5 + dx * 0.5,
    y2: 0.5 + dy * 0.5,
  };
}

// ── Ramer-Douglas-Peucker path simplification (curve-preserving) ───────────
export type PathCmd = [string, ...number[]];

export function autoSimplifyPath(cmds: PathCmd[], eps = 2): PathCmd[] {
  const anchors: [number, number][] = [];
  const anchorCmdIdx: number[] = [];
  const hasClosingZ = cmds.at(-1)?.[0] === "Z";

  for (let i = 0; i < cmds.length; i++) {
    const c = cmds[i];
    if      (c[0] === "M") { anchors.push([c[1], c[2]]); anchorCmdIdx.push(i); }
    else if (c[0] === "L") { anchors.push([c[1], c[2]]); anchorCmdIdx.push(i); }
    else if (c[0] === "Q") { anchors.push([c[3], c[4]]); anchorCmdIdx.push(i); }
    else if (c[0] === "C") { anchors.push([c[5], c[6]]); anchorCmdIdx.push(i); }
  }
  if (anchors.length < 2) return cmds;

  const perpDist = (p: [number, number], a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    if (!dx && !dy) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };

  const keepSet = new Set<number>([0, anchors.length - 1]);
  const rdp = (lo: number, hi: number) => {
    if (hi - lo <= 1) return;
    let max = 0, split = lo;
    for (let i = lo + 1; i < hi; i++) {
      const d = perpDist(anchors[i], anchors[lo], anchors[hi]);
      if (d > max) { max = d; split = i; }
    }
    if (max > eps) { keepSet.add(split); rdp(lo, split); rdp(split, hi); }
  };
  rdp(0, anchors.length - 1);

  const kept = [...keepSet].sort((a, b) => a - b);

  const buildSpanCmd = (from: number, to: number): PathCmd => {
    if (to - from === 1) return [...cmds[anchorCmdIdx[to]]] as PathCmd;

    const p0 = anchors[from], p3 = anchors[to];
    const chord = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
    if (chord < 0.001) return ["L", p3[0], p3[1]];
    const sc = chord / 3;

    const f = cmds[anchorCmdIdx[from + 1]];
    let cp1x: number, cp1y: number;
    if (f[0] === "Q" || f[0] === "C") {
      const dx = f[1] - p0[0], dy = f[2] - p0[1];
      const l = Math.hypot(dx, dy) || chord;
      cp1x = p0[0] + (dx / l) * sc; cp1y = p0[1] + (dy / l) * sc;
    } else {
      cp1x = p0[0] + (p3[0] - p0[0]) / 3; cp1y = p0[1] + (p3[1] - p0[1]) / 3;
    }

    const lc = cmds[anchorCmdIdx[to]];
    let cp2x: number, cp2y: number;
    if (lc[0] === "Q") {
      const dx = p3[0] - lc[1], dy = p3[1] - lc[2];
      const l = Math.hypot(dx, dy) || chord;
      cp2x = p3[0] - (dx / l) * sc; cp2y = p3[1] - (dy / l) * sc;
    } else if (lc[0] === "C") {
      const dx = p3[0] - lc[3], dy = p3[1] - lc[4];
      const l = Math.hypot(dx, dy) || chord;
      cp2x = p3[0] - (dx / l) * sc; cp2y = p3[1] - (dy / l) * sc;
    } else {
      cp2x = p3[0] - (p3[0] - p0[0]) / 3; cp2y = p3[1] - (p3[1] - p0[1]) / 3;
    }

    return ["C", cp1x, cp1y, cp2x, cp2y, p3[0], p3[1]];
  };

  const out: PathCmd[] = [[...cmds[anchorCmdIdx[0]]] as PathCmd];
  for (let k = 1; k < kept.length; k++) out.push(buildSpanCmd(kept[k - 1], kept[k]));
  if (hasClosingZ) out.push(["Z"]);
  return out;
}

// ── Shape path constants ──────────────────────────────────────────────────
export const STAR_PATH  = "M 50 5 L 61 35 L 95 35 L 68 57 L 79 91 L 50 70 L 21 91 L 32 57 L 5 35 L 39 35 Z";
export const HEART_PATH = "M 50 85 C 10 60 -10 35 10 18 C 25 5 42 10 50 22 C 58 10 75 5 90 18 C 110 35 90 60 50 85 Z";

// ── Fabric gradient builder ───────────────────────────────────────────────
/** Builds a Fabric.js Gradient object from a TextGradient spec.
 *  Requires the dynamically-imported FabricMods (specifically mods.Gradient). */
export function buildFabricGradient(gradient: TextGradient, mods: FabricMods) {
  const { stops, angle } = gradient;
  const { x1, y1, x2, y2 } = gradientCoordsFromAngle(angle);
  return new mods.Gradient({
    type: "linear",
    gradientUnits: "percentage",
    coords: { x1, y1, x2, y2 },
    colorStops: stops.map(s => ({ offset: s.offset, color: s.color })),
  });
}

