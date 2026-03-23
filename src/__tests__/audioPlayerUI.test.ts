import { describe, it, expect, vi, beforeEach } from "vitest";
import { drawAudioPlayer, PLAYER_W, PLAYER_H } from "../components/DrawingBoard/audioPlayerUI";

// ── Minimal mock for CanvasRenderingContext2D ──────────────────────────────
function makeMockCtx(measureWidth = 0) {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textBaseline: "" as CanvasTextBaseline,
    textAlign: "" as CanvasTextAlign,
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: measureWidth }),
  } as unknown as CanvasRenderingContext2D;
}

function makeMockCanvas(ctx: CanvasRenderingContext2D): HTMLCanvasElement {
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(ctx),
  } as unknown as HTMLCanvasElement;
  return canvas;
}

// ── drawAudioPlayer: canvas sizing ────────────────────────────────────────
describe("drawAudioPlayer — canvas sizing", () => {
  it("sets canvas width and height to PLAYER_W × PLAYER_H", () => {
    const ctx = makeMockCtx();
    const canvas = makeMockCanvas(ctx);
    drawAudioPlayer(canvas, { trackName: "test", isPlaying: false, progress: 0 });
    expect(canvas.width).toBe(PLAYER_W);
    expect(canvas.height).toBe(PLAYER_H);
  });

  it("clears the canvas before drawing", () => {
    const ctx = makeMockCtx();
    const canvas = makeMockCanvas(ctx);
    drawAudioPlayer(canvas, { trackName: "test", isPlaying: false, progress: 0 });
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, PLAYER_W, PLAYER_H);
  });
});

// ── drawAudioPlayer: play / pause state ──────────────────────────────────
describe("drawAudioPlayer — play/pause icon", () => {
  it("calls fillRect twice (pause bars) when isPlaying is true", () => {
    const ctx = makeMockCtx();
    const canvas = makeMockCanvas(ctx);
    drawAudioPlayer(canvas, { trackName: "track", isPlaying: true, progress: 0 });
    // drawPauseIcon draws 2 fillRects; drawRewindIcon draws 1 fillRect — total 3
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3);
  });

  it("does not call extra fillRect when isPlaying is false (play triangle path only)", () => {
    const ctx = makeMockCtx();
    const canvas = makeMockCanvas(ctx);
    drawAudioPlayer(canvas, { trackName: "track", isPlaying: false, progress: 0 });
    // drawPlayIcon is path-based (no fillRect); drawRewindIcon draws 1 fillRect
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});

// ── drawAudioPlayer: progress bar ─────────────────────────────────────────
describe("drawAudioPlayer — progress bar", () => {
  it("does not draw the filled progress segment when progress is 0", () => {
    const ctx = makeMockCtx();
    const canvas = makeMockCanvas(ctx);
    drawAudioPlayer(canvas, { trackName: "track", isPlaying: false, progress: 0 });
    // fill() is called for bg, border stroke (no), and background bar only — not the blue segment
    const fillCalls = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length;
    // bg + rewind triangle + play triangle + progress bg = 4; no blue segment when progress === 0
    expect(fillCalls).toBe(4);
  });

  it("draws the filled progress segment when progress > 0", () => {
    const ctx = makeMockCtx();
    const canvas = makeMockCanvas(ctx);
    drawAudioPlayer(canvas, { trackName: "track", isPlaying: false, progress: 0.5 });
    // Same 4 base fills + 1 blue progress segment = 5
    const fillCalls = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(fillCalls).toBe(5);
  });

  it("clamps progress > 1 to full bar (does not throw)", () => {
    const ctx = makeMockCtx();
    const canvas = makeMockCanvas(ctx);
    expect(() =>
      drawAudioPlayer(canvas, { trackName: "track", isPlaying: false, progress: 1.5 }),
    ).not.toThrow();
  });
});

// ── drawAudioPlayer: track name rendering ─────────────────────────────────
describe("drawAudioPlayer — track name", () => {
  it("renders the track name via fillText", () => {
    const ctx = makeMockCtx(0); // width 0 → no truncation
    const canvas = makeMockCanvas(ctx);
    drawAudioPlayer(canvas, { trackName: "My Song", isPlaying: false, progress: 0 });
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe("My Song");
  });

  it("truncates a long track name with an ellipsis", () => {
    // measureText always returns a wide width → triggers truncation
    const ctx = makeMockCtx(9999);
    const canvas = makeMockCanvas(ctx);
    drawAudioPlayer(canvas, { trackName: "A Very Long Track Name That Will Be Cut", isPlaying: false, progress: 0 });
    const renderedText: string = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(renderedText.endsWith("…")).toBe(true);
  });

  it("sets textAlign to 'left' before rendering the track name", () => {
    const ctx = makeMockCtx();
    const canvas = makeMockCanvas(ctx);
    drawAudioPlayer(canvas, { trackName: "track", isPlaying: false, progress: 0 });
    expect(ctx.textAlign).toBe("left");
  });
});

// ── drawAudioPlayer: returns early when ctx is unavailable ────────────────
describe("drawAudioPlayer — missing context", () => {
  it("does not throw when getContext returns null", () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(null),
    } as unknown as HTMLCanvasElement;
    expect(() =>
      drawAudioPlayer(canvas, { trackName: "x", isPlaying: false, progress: 0 }),
    ).not.toThrow();
  });
});
