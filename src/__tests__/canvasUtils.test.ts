import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyCtxStyles, replayStroke, clearToBackground, getCanvasBgColor, gradientCoordsFromAngle } from "../components/Editor/Canvas/canvasUtils";
import type { StrokeRecord } from "../components/Editor/Canvas/types";

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

// ── clearToBackground ──────────────────────────────────────────────────────
describe("clearToBackground", () => {
  let ctx: CanvasRenderingContext2D;
  beforeEach(() => { ctx = makeMockCtx(); });

  it("calls save() before and restore() after", () => {
    clearToBackground(ctx);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("resets the transform to identity", () => {
    clearToBackground(ctx);
    expect(ctx.setTransform).toHaveBeenCalledWith(1, 0, 0, 1, 0, 0);
  });

  it("sets globalCompositeOperation to source-over", () => {
    clearToBackground(ctx);
    expect(ctx.globalCompositeOperation).toBe("source-over");
  });

  it("calls fillRect covering the full canvas dimensions", () => {
    clearToBackground(ctx);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 500, 500);
  });
});

// ── getCanvasBgColor ────────────────────────────────────────────────────────
describe("getCanvasBgColor", () => {
  it("returns computed background color when the CSS variable resolves", () => {
    // jsdom getComputedStyle returns "" for CSS vars, but we can spy on it
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      backgroundColor: "rgb(246, 246, 246)",
    } as unknown as CSSStyleDeclaration);
    const color = getCanvasBgColor();
    expect(color).toBe("rgb(246, 246, 246)");
    vi.restoreAllMocks();
  });

  it("falls back to #F6F6F6 when getComputedStyle returns empty string", () => {
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      backgroundColor: "",
    } as unknown as CSSStyleDeclaration);
    const color = getCanvasBgColor();
    expect(color).toBe("#F6F6F6");
    vi.restoreAllMocks();
  });
});

// ── gradientCoordsFromAngle ─────────────────────────────────────────────────
describe("gradientCoordsFromAngle", () => {
  const TOLERANCE = 1e-10;

  it("angle 90° produces a left-to-right horizontal gradient", () => {
    const { x1, y1, x2, y2 } = gradientCoordsFromAngle(90);
    expect(x1).toBeCloseTo(0, 10);
    expect(y1).toBeCloseTo(0.5, 10);
    expect(x2).toBeCloseTo(1, 10);
    expect(y2).toBeCloseTo(0.5, 10);
  });

  it("angle 270° produces a right-to-left gradient", () => {
    const { x1, y1, x2, y2 } = gradientCoordsFromAngle(270);
    expect(x1).toBeCloseTo(1, 10);
    expect(y1).toBeCloseTo(0.5, 10);
    expect(x2).toBeCloseTo(0, 10);
    expect(y2).toBeCloseTo(0.5, 10);
  });

  it("angle 180° produces a top-to-bottom gradient", () => {
    const { x1, y1, x2, y2 } = gradientCoordsFromAngle(180);
    expect(x1).toBeCloseTo(0.5, 10);
    expect(y1).toBeCloseTo(0, 10);
    expect(x2).toBeCloseTo(0.5, 10);
    expect(y2).toBeCloseTo(1, 10);
  });

  it("angle 0° produces a bottom-to-top gradient", () => {
    const { x1, y1, x2, y2 } = gradientCoordsFromAngle(0);
    expect(x1).toBeCloseTo(0.5, 10);
    expect(y1).toBeCloseTo(1, 10);
    expect(x2).toBeCloseTo(0.5, 10);
    expect(y2).toBeCloseTo(0, 10);
  });

  it("start and end points are always symmetric around the centre (0.5, 0.5)", () => {
    for (const angle of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const { x1, y1, x2, y2 } = gradientCoordsFromAngle(angle);
      expect((x1 + x2) / 2).toBeCloseTo(0.5, 10);
      expect((y1 + y2) / 2).toBeCloseTo(0.5, 10);
    }
  });

  it("the distance between start and end is always 1 unit", () => {
    for (const angle of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const { x1, y1, x2, y2 } = gradientCoordsFromAngle(angle);
      const dist = Math.hypot(x2 - x1, y2 - y1);
      expect(dist).toBeCloseTo(1, 10);
    }
    void TOLERANCE; // silence unused-var warning
  });

  it("opposite angles produce reversed coords", () => {
    const a = gradientCoordsFromAngle(60);
    const b = gradientCoordsFromAngle(240);
    expect(a.x1).toBeCloseTo(b.x2, 10);
    expect(a.y1).toBeCloseTo(b.y2, 10);
    expect(a.x2).toBeCloseTo(b.x1, 10);
    expect(a.y2).toBeCloseTo(b.y1, 10);
  });
});

