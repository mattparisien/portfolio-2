import { describe, it, expect } from "vitest";
import { DEFAULT_TEXT_PROPS } from "../components/DrawingBoard/types";

describe("DEFAULT_TEXT_PROPS", () => {
  it("fontFamily is 'sans-serif'", () => {
    expect(DEFAULT_TEXT_PROPS.fontFamily).toBe("sans-serif");
  });

  it("fontSize is 24", () => {
    expect(DEFAULT_TEXT_PROPS.fontSize).toBe(24);
  });

  it("lineHeight is 1.16", () => {
    expect(DEFAULT_TEXT_PROPS.lineHeight).toBeCloseTo(1.16);
  });

  it("charSpacing is 0", () => {
    expect(DEFAULT_TEXT_PROPS.charSpacing).toBe(0);
  });

  it("textAlign is 'left'", () => {
    expect(DEFAULT_TEXT_PROPS.textAlign).toBe("left");
  });

  it("bold is false by default", () => {
    expect(DEFAULT_TEXT_PROPS.bold).toBe(false);
  });

  it("italic is false by default", () => {
    expect(DEFAULT_TEXT_PROPS.italic).toBe(false);
  });

  it("underline is false by default", () => {
    expect(DEFAULT_TEXT_PROPS.underline).toBe(false);
  });

  it("linethrough is false by default", () => {
    expect(DEFAULT_TEXT_PROPS.linethrough).toBe(false);
  });

  it("uppercase is false by default", () => {
    expect(DEFAULT_TEXT_PROPS.uppercase).toBe(false);
  });

  it("gradient is null by default", () => {
    expect(DEFAULT_TEXT_PROPS.gradient).toBeNull();
  });

  it("has all required TextProps keys", () => {
    const required: (keyof typeof DEFAULT_TEXT_PROPS)[] = [
      "fontFamily", "fontSize", "bold", "italic", "underline",
      "linethrough", "uppercase", "lineHeight", "charSpacing",
      "textAlign", "gradient",
    ];
    for (const key of required) {
      expect(DEFAULT_TEXT_PROPS).toHaveProperty(key);
    }
  });
});
