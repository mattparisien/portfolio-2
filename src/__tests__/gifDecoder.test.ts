import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clampDelay, decodeGif } from "../components/DrawingBoard/gifDecoder";
import type { Mock } from "vitest";

// ---------------------------------------------------------------------------
// ImageData polyfill — jsdom doesn't ship this without the native canvas pkg.
// ---------------------------------------------------------------------------

if (typeof globalThis.ImageData === "undefined") {
  // @ts-expect-error minimal polyfill sufficient for gifDecoder's usage
  globalThis.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}

// ---------------------------------------------------------------------------
// Canvas + GifReader mocks — jsdom doesn't implement canvas rendering APIs.
// ---------------------------------------------------------------------------

vi.mock("omggif", () => ({ GifReader: vi.fn() }));

import { GifReader } from "omggif";
const MockGifReader = GifReader as unknown as Mock;

function makeCtxStub() {
  return {
    clearRect: vi.fn(),
    putImageData: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) } as ImageData)),
    drawImage: vi.fn(),
  };
}

type CtxStub = ReturnType<typeof makeCtxStub>;

let ctxStubs: CtxStub[];

function installCanvasMock() {
  ctxStubs = [];
  const origCreate = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") {
      const ctx = makeCtxStub();
      ctxStubs.push(ctx);
      const canvas = { width: 0, height: 0, getContext: vi.fn(() => ctx) };
      return canvas as unknown as HTMLElement;
    }
    return origCreate(tag);
  });
}

// Helper: build a GifReader-like mock from a list of frame descriptors
interface FrameDesc {
  delay?: number;
  disposal?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

function makeReader(fw: number, fh: number, frames: FrameDesc[]) {
  return {
    width: fw,
    height: fh,
    numFrames: vi.fn(() => frames.length),
    frameInfo: vi.fn((i: number) => ({
      delay:    frames[i].delay    ?? 5,
      disposal: frames[i].disposal ?? 0,
      x:        frames[i].x        ?? 0,
      y:        frames[i].y        ?? 0,
      width:    frames[i].width    ?? fw,
      height:   frames[i].height   ?? fh,
    })),
    decodeAndBlitFrameRGBA: vi.fn(),
  };
}

/**
 * Installs a GifReader class mock that returns the given reader object when
 * called with `new`. Regular constructor functions can return an explicit
 * object to override `this` — this is the standard pattern for constructor
 * mocks in Vitest when you need `new` support.
 */
function useReader(reader: ReturnType<typeof makeReader>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MockGifReader.mockImplementation(function (this: any) {
    return reader;
  } as unknown as (...args: unknown[]) => unknown);
}

// ── clampDelay ──────────────────────────────────────────────────────────────
// GIF stores delays in centiseconds; clampDelay converts to ms and enforces
// a 20 ms floor so that 0-delay frames don't cause a render-blocking loop.
describe("clampDelay", () => {
  it("converts centiseconds to milliseconds (×10)", () => {
    expect(clampDelay(10)).toBe(100);
    expect(clampDelay(5)).toBe(50);
    expect(clampDelay(100)).toBe(1000);
  });

  it("returns exactly 20 ms when the input is 2 centisecs (boundary)", () => {
    expect(clampDelay(2)).toBe(20);
  });

  it("clamps a 1-centisecond delay up to 20 ms", () => {
    expect(clampDelay(1)).toBe(20);
  });

  it("clamps a 0-centisecond delay (missing/default) up to 20 ms", () => {
    expect(clampDelay(0)).toBe(20);
  });

  it("does not clamp delays above the minimum", () => {
    expect(clampDelay(3)).toBe(30);
    expect(clampDelay(50)).toBe(500);
  });

  it("handles large delay values correctly", () => {
    expect(clampDelay(500)).toBe(5000);
  });

  it("never returns a value below 20 ms for any non-negative input", () => {
    for (const cs of [0, 0.1, 0.5, 1, 1.5, 1.9, 2]) {
      expect(clampDelay(cs)).toBeGreaterThanOrEqual(20);
    }
  });
});

// ── decodeGif ───────────────────────────────────────────────────────────────

describe("decodeGif", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installCanvasMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns correct frameWidth, frameHeight, totalFrames for a single-frame GIF", () => {
    const reader = makeReader(20, 10, [{ delay: 5 }]);
    useReader(reader);

    const result = decodeGif(new ArrayBuffer(0));

    expect(result.frameWidth).toBe(20);
    expect(result.frameHeight).toBe(10);
    expect(result.totalFrames).toBe(1);
  });

  it("returns correct totalFrames and delays length for a 3-frame GIF", () => {
    const reader = makeReader(16, 8, [{ delay: 5 }, { delay: 10 }, { delay: 3 }]);
    useReader(reader);

    const result = decodeGif(new ArrayBuffer(0));

    expect(result.totalFrames).toBe(3);
    expect(result.delays).toHaveLength(3);
  });

  it("converts frame delays via clampDelay (×10, floored to 20 ms)", () => {
    const reader = makeReader(4, 4, [
      { delay: 0 },   // → 20 ms (clamped)
      { delay: 10 },  // → 100 ms
      { delay: 1 },   // → 20 ms (clamped)
    ]);
    useReader(reader);

    const { delays } = decodeGif(new ArrayBuffer(0));

    expect(delays[0]).toBe(20);
    expect(delays[1]).toBe(100);
    expect(delays[2]).toBe(20);
  });

  it("uses fallback delay of 5 cs (50 ms) when frameInfo.delay is undefined", () => {
    const reader = makeReader(4, 4, [{ delay: undefined }]);
    useReader(reader);

    const { delays } = decodeGif(new ArrayBuffer(0));
    // delay ?? 5 → 5 × 10 = 50, above 20 ms floor
    expect(delays[0]).toBe(50);
  });

  it("calls decodeAndBlitFrameRGBA once per frame", () => {
    const reader = makeReader(4, 4, [{ delay: 5 }, { delay: 5 }, { delay: 5 }]);
    useReader(reader);

    decodeGif(new ArrayBuffer(0));

    expect(reader.decodeAndBlitFrameRGBA).toHaveBeenCalledTimes(3);
  });

  it("disposal 2: calls clearRect on composite ctx with previous frame rect", () => {
    // Frame 0 has disposal=2, sub-rect at (1,2,3,4)
    // Frame 1 triggers the clearRect before it is drawn
    const reader = makeReader(10, 10, [
      { delay: 5, disposal: 2, x: 1, y: 2, width: 3, height: 4 },
      { delay: 5, disposal: 0 },
    ]);
    useReader(reader);

    decodeGif(new ArrayBuffer(0));

    // composite canvas is ctxStubs[0] (first createElement("canvas"))
    expect(ctxStubs[0].clearRect).toHaveBeenCalledWith(1, 2, 3, 4);
  });

  it("disposal 2: does not call clearRect when disposal is not 2", () => {
    const reader = makeReader(10, 10, [{ delay: 5, disposal: 0 }, { delay: 5 }]);
    useReader(reader);

    decodeGif(new ArrayBuffer(0));

    expect(ctxStubs[0].clearRect).not.toHaveBeenCalled();
  });

  it("disposal 3: getImageData is called on composite ctx when frame has disposal=3", () => {
    const reader = makeReader(8, 8, [
      { delay: 5, disposal: 3 },
      { delay: 5, disposal: 0 },
    ]);
    useReader(reader);

    decodeGif(new ArrayBuffer(0));

    // getImageData saved before drawing the disposal=3 frame (frame 0)
    expect(ctxStubs[0].getImageData).toHaveBeenCalledWith(0, 0, 8, 8);
  });

  it("disposal 3: putImageData restores the exact value returned by getImageData", () => {
    const reader = makeReader(8, 8, [
      { delay: 5, disposal: 3 },
      { delay: 5, disposal: 0 },
    ]);
    useReader(reader);

    decodeGif(new ArrayBuffer(0));

    // getImageData was called once to save the composite state before frame 0.
    // putImageData must be called with that same return value on frame 1.
    const saved = ctxStubs[0].getImageData.mock.results[0].value as ImageData;
    expect(ctxStubs[0].putImageData).toHaveBeenCalledWith(saved, 0, 0);
  });

  it("stamps each frame onto the sheet canvas via drawImage", () => {
    const reader = makeReader(6, 6, [{ delay: 5 }, { delay: 5 }, { delay: 5 }]);
    useReader(reader);

    decodeGif(new ArrayBuffer(0));

    // Sheet canvas is ctxStubs[1] (composite=0, sheet=1, tmp per frame=2+)
    expect(ctxStubs[1].drawImage).toHaveBeenCalledTimes(3);
  });

  it("spritesheet canvas width equals frameWidth × totalFrames", () => {
    const reader = makeReader(12, 8, [{ delay: 4 }, { delay: 4 }, { delay: 4 }]);
    useReader(reader);

    const result = decodeGif(new ArrayBuffer(0));
    // The mock canvas is a plain object; decodeGif sets sheet.width directly
    expect((result.spritesheet as unknown as { width: number }).width).toBe(12 * 3);
  });

  it("spritesheet canvas height equals frameHeight", () => {
    const reader = makeReader(12, 8, [{ delay: 4 }, { delay: 4 }]);
    useReader(reader);

    const result = decodeGif(new ArrayBuffer(0));
    expect((result.spritesheet as unknown as { height: number }).height).toBe(8);
  });
});
