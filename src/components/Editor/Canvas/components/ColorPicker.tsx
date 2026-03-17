"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ── Color math ───────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function hsv2rgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
}
function rgb2hex(r: number, g: number, b: number): string {
  return "#" + [r, g, b]
    .map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
    .join("");
}
function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}
function rgb2hsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, v];
}
function hex2hsv(hex: string): [number, number, number] {
  return rgb2hsv(...hex2rgb(hex));
}

// ── Component ────────────────────────────────────────────────────────────────
interface ColorPickerProps {
  color: string; // hex
  onChange: (hex: string) => void;
  /** Height of the sv-square in px. Default 140 */
  squareHeight?: number;
}

export default function ColorPicker({ color, onChange, squareHeight = 140 }: ColorPickerProps) {
  const validHex = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#000000";

  const [hsv, setHsv] = useState<[number, number, number]>(() => hex2hsv(validHex));
  const [hexInput, setHexInput] = useState(validHex);

  const lastEmitted = useRef(validHex);

  // Sync when the *external* color prop changes (not caused by our own onChange)
  useEffect(() => {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
    if (color.toLowerCase() === lastEmitted.current.toLowerCase()) return;
    lastEmitted.current = color;
    setHsv(hex2hsv(color));
    setHexInput(color);
  }, [color]);

  const [h, s, v] = hsv;

  const sqRef  = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const sqActive  = useRef(false);
  const hueActive = useRef(false);

  const emit = useCallback((nh: number, ns: number, nv: number) => {
    const hex = rgb2hex(...hsv2rgb(nh, ns, nv));
    lastEmitted.current = hex;
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  // ── SV Square ───────────────────────────────────────────────────────────
  const updateSq = useCallback((cx: number, cy: number) => {
    const el = sqRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ns = clamp((cx - r.left) / r.width, 0, 1);
    const nv = clamp(1 - (cy - r.top) / r.height, 0, 1);
    setHsv(prev => [prev[0], ns, nv]);
    emit(h, ns, nv);
  }, [h, emit]);

  const onSqDown = (e: React.PointerEvent) => {
    sqActive.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateSq(e.clientX, e.clientY);
  };
  const onSqMove = (e: React.PointerEvent) => {
    if (!sqActive.current) return;
    updateSq(e.clientX, e.clientY);
  };
  const onSqUp = () => { sqActive.current = false; };

  // ── Hue bar ──────────────────────────────────────────────────────────────
  const updateHue = useCallback((cx: number) => {
    const el = hueRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nh = clamp((cx - r.left) / r.width, 0, 1) * 360;
    setHsv([nh, s, v]);
    emit(nh, s, v);
  }, [s, v, emit]);

  const onHueDown = (e: React.PointerEvent) => {
    hueActive.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateHue(e.clientX);
  };
  const onHueMove = (e: React.PointerEvent) => {
    if (!hueActive.current) return;
    updateHue(e.clientX);
  };
  const onHueUp = () => { hueActive.current = false; };

  // Derived display values
  const hueColor = rgb2hex(...hsv2rgb(h, 1, 1));
  const currentHex = rgb2hex(...hsv2rgb(h, s, v));

  return (
    <div>
      {/* ── SV square ── */}
      <div
        ref={sqRef}
        className="relative w-full rounded-lg mb-2 select-none touch-none"
        style={{ height: squareHeight, cursor: "crosshair", background: hueColor }}
        onPointerDown={onSqDown}
        onPointerMove={onSqMove}
        onPointerUp={onSqUp}
      >
        {/* Saturation overlay: white → transparent */}
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ background: "linear-gradient(to right, #fff, transparent)" }}
        />
        {/* Value overlay: transparent → black */}
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #000)" }}
        />
        {/* Thumb */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${s * 100}%`,
            top: `${(1 - v) * 100}%`,
            transform: "translate(-50%, -50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "2.5px solid #fff",
            boxShadow: "0 0 0 1.5px rgba(0,0,0,0.35)",
            background: currentHex,
          }}
        />
      </div>

      {/* ── Hue bar ── */}
      <div
        ref={hueRef}
        className="relative rounded-full mb-3 select-none touch-none"
        style={{
          height: 12,
          cursor: "ew-resize",
          background:
            "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
        }}
        onPointerDown={onHueDown}
        onPointerMove={onHueMove}
        onPointerUp={onHueUp}
      >
        {/* Thumb */}
        <div
          className="absolute top-1/2 pointer-events-none"
          style={{
            left: `${(h / 360) * 100}%`,
            transform: "translate(-50%, -50%)",
            width: 16,
            height: 16,
            borderRadius: "50%",
            border: "2.5px solid #fff",
            boxShadow: "0 0 0 1.5px rgba(0,0,0,0.35)",
            background: hueColor,
          }}
        />
      </div>

      {/* ── Hex input ── */}
      <div className="flex items-center gap-2">
        <span
          className="flex-shrink-0 rounded-full"
          style={{
            width: 20,
            height: 20,
            background: currentHex,
            outline: "1.5px solid rgba(0,0,0,0.14)",
            outlineOffset: 1,
          }}
        />
        <input
          type="text"
          value={hexInput}
          maxLength={7}
          spellCheck={false}
          placeholder="#000000"
          onChange={e => {
            const val = e.target.value;
            setHexInput(val);
            if (/^#[0-9a-fA-F]{6}$/.test(val)) {
              lastEmitted.current = val;
              setHsv(hex2hsv(val));
              onChange(val);
            }
          }}
          onBlur={() => setHexInput(currentHex)}
          className="flex-1 text-xs font-mono border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-gray-400 transition-colors bg-black/[0.02]"
        />
      </div>
    </div>
  );
}
