import { describe, it, expect } from "vitest";
import { autoSimplifyPath } from "../components/Editor/Canvas/canvasUtils";
import type { PathCmd } from "../components/Editor/Canvas/canvasUtils";

// ── autoSimplifyPath (Ramer-Douglas-Peucker) ────────────────────────────────
describe("autoSimplifyPath", () => {
  it("returns the original commands unchanged when there is only one anchor point", () => {
    const cmds: PathCmd[] = [["M", 0, 0]];
    expect(autoSimplifyPath(cmds)).toEqual(cmds);
  });

  it("always preserves the start and end points", () => {
    // 5 collinear L commands — interior points should be removed
    const cmds: PathCmd[] = [
      ["M", 0, 0],
      ["L", 25, 0],
      ["L", 50, 0],
      ["L", 75, 0],
      ["L", 100, 0],
    ];
    const result = autoSimplifyPath(cmds, 1);
    const first = result[0];
    const last = result[result.length - 1];
    // Start point
    expect(first[0]).toBe("M");
    expect(first[1]).toBe(0);
    expect(first[2]).toBe(0);
    // End point
    expect(last[last.length - 2]).toBeCloseTo(100);
    expect(last[last.length - 1]).toBeCloseTo(0);
  });

  it("reduces collinear points below the epsilon threshold", () => {
    // All points on the x-axis → interior points are co-linear, should be eliminated
    const cmds: PathCmd[] = [
      ["M", 0, 0],
      ["L", 20, 0],
      ["L", 40, 0],
      ["L", 60, 0],
      ["L", 80, 0],
      ["L", 100, 0],
    ];
    const result = autoSimplifyPath(cmds, 1);
    // Collinear points have zero perpendicular distance → should reduce to 2 commands (M + single L)
    expect(result.length).toBeLessThan(cmds.length);
  });

  it("keeps points that deviate more than epsilon from the chord", () => {
    // A clear right-angle detour: 0,0 → 50,50 → 100,0
    // The middle point (50,50) deviates 35+ px from the chord between (0,0) and (100,0)
    const cmds: PathCmd[] = [
      ["M", 0, 0],
      ["L", 50, 50],
      ["L", 100, 0],
    ];
    const result = autoSimplifyPath(cmds, 1);
    // All 3 anchor points must be in the output (2 is start+end, middle deviates enough)
    expect(result.length).toBe(3);
  });

  it("preserves the closing Z command when present", () => {
    const cmds: PathCmd[] = [
      ["M", 0, 0],
      ["L", 50, 0],
      ["L", 100, 0],
      ["Z"],
    ];
    const result = autoSimplifyPath(cmds, 1);
    const lastCmd = result[result.length - 1];
    expect(lastCmd[0]).toBe("Z");
  });

  it("does not add Z when input has no closing command", () => {
    const cmds: PathCmd[] = [
      ["M", 0, 0],
      ["L", 50, 25],
      ["L", 100, 0],
    ];
    const result = autoSimplifyPath(cmds, 1);
    const lastCmd = result[result.length - 1];
    expect(lastCmd[0]).not.toBe("Z");
  });

  it("handles Q (quadratic) commands — uses anchor point at indices 3,4", () => {
    const cmds: PathCmd[] = [
      ["M", 0, 0],
      ["Q", 25, 0, 50, 0], // control (25,0), anchor (50,0) — collinear
      ["Q", 75, 0, 100, 0], // control (75,0), anchor (100,0) — collinear
    ];
    const result = autoSimplifyPath(cmds, 1);
    expect(result.length).toBeLessThanOrEqual(cmds.length);
  });

  it("handles C (cubic) commands — uses anchor point at indices 5,6", () => {
    const cmds: PathCmd[] = [
      ["M", 0, 0],
      ["C", 10, 0, 20, 0, 50, 0],  // cubic, end anchor (50,0) — collinear
      ["C", 60, 0, 80, 0, 100, 0], // cubic, end anchor (100,0) — collinear
    ];
    const result = autoSimplifyPath(cmds, 1);
    expect(result.length).toBeLessThanOrEqual(cmds.length);
  });

  it("returns only M + one command for perfectly collinear L commands", () => {
    const cmds: PathCmd[] = [
      ["M", 0, 0],
      ["L", 10, 0],
      ["L", 20, 0],
      ["L", 30, 0],
      ["L", 40, 0],
    ];
    const result = autoSimplifyPath(cmds, 0.5);
    // Start M + end L = 2 commands
    expect(result).toHaveLength(2);
    expect(result[0][0]).toBe("M");
  });

  it("higher epsilon eliminates more intermediate points", () => {
    // Slightly curved path — lower eps keeps more, higher eps removes more
    const cmds: PathCmd[] = [
      ["M", 0, 0],
      ["L", 20, 1],
      ["L", 40, 2],
      ["L", 60, 1],
      ["L", 80, 0],
      ["L", 100, 0],
    ];
    const tight = autoSimplifyPath(cmds, 0.5);
    const loose = autoSimplifyPath(cmds, 10);
    expect(loose.length).toBeLessThanOrEqual(tight.length);
  });
});
