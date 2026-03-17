import { describe, it, expect } from "vitest";
import { clampDelay } from "../components/Editor/Canvas/gifDecoder";

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
