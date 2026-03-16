import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BOARD_ID, COLORS, BRUSH_SIZES, CURSOR_COLORS, CURSOR_NAMES, getOrCreateUser } from "../components/DrawingBoard/constants";

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

// ── Static constants ────────────────────────────────────────────────────────
describe("BOARD_ID", () => {
  it('equals "main"', () => {
    expect(BOARD_ID).toBe("main");
  });
});

describe("COLORS", () => {
  it("has exactly 10 entries", () => {
    expect(COLORS).toHaveLength(10);
  });

  it("all entries are valid 6-digit hex colors", () => {
    for (const c of COLORS) {
      expect(c).toMatch(HEX_COLOR_RE);
    }
  });

  it("contains black (#000000) and white (#ffffff)", () => {
    expect(COLORS).toContain("#000000");
    expect(COLORS).toContain("#ffffff");
  });
});

describe("BRUSH_SIZES", () => {
  it("has 5 entries", () => {
    expect(BRUSH_SIZES).toHaveLength(5);
  });

  it("contains only positive integers", () => {
    for (const s of BRUSH_SIZES) {
      expect(s).toBeGreaterThan(0);
      expect(Number.isInteger(s)).toBe(true);
    }
  });

  it("is sorted in ascending order", () => {
    const arr = [...BRUSH_SIZES];
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i]).toBeGreaterThan(arr[i - 1]);
    }
  });
});

describe("CURSOR_COLORS", () => {
  it("has exactly 11 entries", () => {
    expect(CURSOR_COLORS).toHaveLength(11);
  });

  it("all entries are valid 6-digit hex colors", () => {
    for (const c of CURSOR_COLORS) {
      expect(c).toMatch(HEX_COLOR_RE);
    }
  });

  it("all entries are unique", () => {
    const unique = new Set(CURSOR_COLORS);
    expect(unique.size).toBe(CURSOR_COLORS.length);
  });
});

describe("CURSOR_NAMES", () => {
  it("has exactly 50 entries", () => {
    expect(CURSOR_NAMES).toHaveLength(50);
  });

  it("all entries are non-empty strings", () => {
    for (const n of CURSOR_NAMES) {
      expect(typeof n).toBe("string");
      expect(n.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate entries", () => {
    const unique = new Set(CURSOR_NAMES);
    expect(unique.size).toBe(CURSOR_NAMES.length);
  });
});

// ── getOrCreateUser ─────────────────────────────────────────────────────────
describe("getOrCreateUser", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("returns an object with a name property that is a string", () => {
    const user = getOrCreateUser();
    expect(user).toHaveProperty("name");
    expect(typeof user.name).toBe("string");
    expect(user.name.length).toBeGreaterThan(0);
  });

  it("persists the user to sessionStorage on first call", () => {
    getOrCreateUser();
    const stored = sessionStorage.getItem("lb_user");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveProperty("name");
  });

  it("returns the same user on repeated calls", () => {
    const first = getOrCreateUser();
    const second = getOrCreateUser();
    expect(second.name).toBe(first.name);
  });

  it("uses a name from CURSOR_NAMES", () => {
    const { name } = getOrCreateUser();
    expect(CURSOR_NAMES as readonly string[]).toContain(name);
  });

  it("returns a fresh name if sessionStorage has been cleared", () => {
    const first = getOrCreateUser();
    sessionStorage.clear();
    const second = getOrCreateUser();
    // Both should still be valid CURSOR_NAMES entries
    expect(CURSOR_NAMES as readonly string[]).toContain(first.name);
    expect(CURSOR_NAMES as readonly string[]).toContain(second.name);
  });
});
