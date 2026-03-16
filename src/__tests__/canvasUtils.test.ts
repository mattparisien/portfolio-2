import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyCtxStyles, replayStroke } from "../components/DrawingBoard/canvasUtils";
import type { StrokeRecord } from "../components/DrawingBoard/types";

// ── Minimal mock for CanvasRenderingContext2D ──────────────────────────────
function makeMockCtx() {
  return {
    lineCap: "" as CanvasLineCap,
    lineJoin: "" as CanvasLineJoin,
    globalCompositeOperation: "" as GlobalCompositeOperation,
    strokeStyle: "" as string | CanvasGradient | CanvasPattern,
    lineWidth: 0,
    fillStyle: "" as string | CanvasGradient | CanvasPattern,
    font: "",
    textBaseline: "" as CanvasTextBaseline,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    arc: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    fillRect: vi.fn(),
    canvas: { width: 500, height: 500 },
  } as unknown as CanvasRenderingContext2D;
}

// ── applyCtxStyles ─────────────────────────────────────────────────────────
describe("applyCtxStyles", () => {
  let ctx: CanvasRenderingContext2D;
  beforeEach(() => { ctx = makeMockCtx(); });

  it("sets lineCap to 'round'", () => {
    applyCtxStyles(ctx, "pencil", "#000", 2);
    expect(ctx.lineCap).toBe("round");
  });

  it("sets lineJoin to 'round'", () => {
    applyCtxStyles(ctx, "pencil", "#000", 2);
    expect(ctx.lineJoin).toBe("round");
  });

  it("uses destination-out for eraser tool", () => {
    applyCtxStyles(ctx, "eraser", "#000", 10);
    expect(ctx.globalCompositeOperation).toBe("destination-out");
  });

  it("uses source-over for pencil tool", () => {
    applyCtxStyles(ctx, "pencil", "#ff0000", 3);
    expect(ctx.globalCompositeOperation).toBe("source-over");
  });

  it("uses source-over for brush tool", () => {
    applyCtxStyles(ctx, "brush", "#00ff00", 5);
    expect(ctx.globalCompositeOperation).toBe("source-over");
  });

  it("uses source-over for line tool", () => {
    applyCtxStyles(ctx, "line", "#0000ff", 1);
    expect(ctx.globalCompositeOperation).toBe("source-over");
  });

  it("sets strokeStyle to the provided color", () => {
    applyCtxStyles(ctx, "pencil", "#abc123", 5);
    expect(ctx.strokeStyle).toBe("#abc123");
  });

  it("sets lineWidth to the provided brushSize", () => {
    applyCtxStyles(ctx, "pencil", "#000", 17);
    expect(ctx.lineWidth).toBe(17);
  });

  it("sets lineWidth to 0 when brushSize is 0", () => {
    applyCtxStyles(ctx, "pencil", "#000", 0);
    expect(ctx.lineWidth).toBe(0);
  });
});

// ── replayStroke ───────────────────────────────────────────────────────────
describe("replayStroke", () => {
  let ctx: CanvasRenderingContext2D;
  beforeEach(() => { ctx = makeMockCtx(); });

  it("returns early and does nothing when points array is empty", () => {
    const stroke: StrokeRecord = { tool: "pencil", color: "#000", brushSize: 2, points: [] };
    replayStroke(ctx, stroke);
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it("returns early when points is undefined/null", () => {
    const stroke = { tool: "pencil", color: "#000", brushSize: 2 } as unknown as StrokeRecord;
    replayStroke(ctx, stroke);
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it("calls fillText for text tool with non-empty text", () => {
    const stroke: StrokeRecord = {
      tool: "text", color: "#ff0000", brushSize: 20,
      points: [{ x: 10, y: 20 }], text: "Hello",
    };
    replayStroke(ctx, stroke);
    expect(ctx.fillText).toHaveBeenCalledWith("Hello", 10, 20);
  });

  it("does not call stroke for text tool", () => {
    const stroke: StrokeRecord = {
      tool: "text", color: "#000", brushSize: 20,
      points: [{ x: 0, y: 0 }], text: "Hi",
    };
    replayStroke(ctx, stroke);
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it("uses fontSize from stroke.fontSize when provided for text", () => {
    const stroke: StrokeRecord = {
      tool: "text", color: "#000", brushSize: 20,
      points: [{ x: 5, y: 5 }], text: "Hi", fontSize: 32,
    };
    replayStroke(ctx, stroke);
    expect(ctx.font).toContain("32px");
  });

  it("calls arc for a single-point stroke", () => {
    const stroke: StrokeRecord = {
      tool: "pencil", color: "#000", brushSize: 4, points: [{ x: 50, y: 50 }],
    };
    replayStroke(ctx, stroke);
    expect(ctx.arc).toHaveBeenCalledWith(50, 50, 2, 0, Math.PI * 2);
  });

  it("calls fill (not stroke) for a single-point stroke", () => {
    const stroke: StrokeRecord = {
      tool: "pencil", color: "#000", brushSize: 4, points: [{ x: 50, y: 50 }],
    };
    replayStroke(ctx, stroke);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it("sets fillStyle to color for a single-point non-eraser stroke", () => {
    const stroke: StrokeRecord = {
      tool: "pencil", color: "#ff5500", brushSize: 4, points: [{ x: 5, y: 5 }],
    };
    replayStroke(ctx, stroke);
    expect(ctx.fillStyle).toBe("#ff5500");
  });

  it("applies destination-out and opaque fill for single-point eraser", () => {
    const stroke: StrokeRecord = {
      tool: "eraser", color: "#ffffff", brushSize: 10, points: [{ x: 10, y: 10 }],
    };
    replayStroke(ctx, stroke);
    expect(ctx.globalCompositeOperation).toBe("destination-out");
    expect(ctx.fillStyle).toBe("rgba(0,0,0,1)");
  });

  it("calls quadraticCurveTo for multi-point stroke", () => {
    const stroke: StrokeRecord = {
      tool: "pencil", color: "#000", brushSize: 2,
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }],
    };
    replayStroke(ctx, stroke);
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });

  it("calls stroke after multi-point replay", () => {
    const stroke: StrokeRecord = {
      tool: "pencil", color: "#000", brushSize: 2,
      points: [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }],
    };
    replayStroke(ctx, stroke);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("calls moveTo to the first point for multi-point stroke", () => {
    const stroke: StrokeRecord = {
      tool: "pencil", color: "#000", brushSize: 2,
      points: [{ x: 7, y: 3 }, { x: 14, y: 9 }, { x: 21, y: 3 }],
    };
    replayStroke(ctx, stroke);
    expect(ctx.moveTo).toHaveBeenCalledWith(7, 3);
  });
});
