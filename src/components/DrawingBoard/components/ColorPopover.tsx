"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Canvas } from "fabric";
import type { TextGradient } from "../types";
import { COLORS } from "../constants";
import ColorPicker from "./ColorPicker";

// ── Internal stop type (id only used inside this component for React keys) ─
interface GStop { id: string; offset: number; color: string; }
function uid() { return Math.random().toString(36).slice(2, 9); }
function mkStop(color: string, offset: number): GStop { return { id: uid(), color, offset }; }

// ── Color utilities ─────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  return [parseInt(full.slice(0, 2), 16) || 0, parseInt(full.slice(2, 4), 16) || 0, parseInt(full.slice(4, 6), 16) || 0];
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function lerpHex(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1); const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
function colorAtOffset(stops: GStop[], offset: number): string {
  const s = [...stops].sort((a, b) => a.offset - b.offset);
  if (!s.length) return "#000000";
  if (offset <= s[0].offset) return s[0].color;
  if (offset >= s[s.length - 1].offset) return s[s.length - 1].color;
  for (let i = 0; i < s.length - 1; i++) {
    if (offset >= s[i].offset && offset <= s[i + 1].offset) {
      const t = (offset - s[i].offset) / (s[i + 1].offset - s[i].offset);
      return lerpHex(s[i].color, s[i + 1].color, t);
    }
  }
  return "#000000";
}
function stopsToCSS(stops: GStop[], angle: number): string {
  const s = [...stops].sort((a, b) => a.offset - b.offset);
  return `linear-gradient(${angle}deg, ${s.map(st => `${st.color} ${Math.round(st.offset * 100)}%`).join(", ")})`;
}
function toTextGradient(stops: GStop[], angle: number): TextGradient {
  return {
    stops: [...stops].sort((a, b) => a.offset - b.offset).map(({ color, offset }) => ({ color, offset })),
    angle,
  };
}

// ── Presets ──────────────────────────────────────────────────────────────────
const PRESETS: Array<{ label: string; stops: Array<{ color: string; offset: number }>; angle: number }> = [
  { label: "Candy",   angle: 90,  stops: [{ color: "#FF6EE7", offset: 0 }, { color: "#B44FFF", offset: 1 }] },
  { label: "Ocean",   angle: 90,  stops: [{ color: "#B44FFF", offset: 0 }, { color: "#7DF9FF", offset: 1 }] },
  { label: "Sunset",  angle: 90,  stops: [{ color: "#FF4DA6", offset: 0 }, { color: "#FFD700", offset: 1 }] },
  { label: "Aurora",  angle: 135, stops: [{ color: "#00F5D4", offset: 0 }, { color: "#C77DFF", offset: 0.5 }, { color: "#FF6EE7", offset: 1 }] },
  { label: "Pop",     angle: 90,  stops: [{ color: "#FF85A1", offset: 0 }, { color: "#FFF01F", offset: 1 }] },
  { label: "Neon",    angle: 90,  stops: [{ color: "#ADFF2F", offset: 0 }, { color: "#7DF9FF", offset: 1 }] },
  { label: "Fire",    angle: 90,  stops: [{ color: "#FF6B6B", offset: 0 }, { color: "#FFD93D", offset: 1 }] },
  { label: "Rainbow", angle: 90,  stops: [{ color: "#FF0000", offset: 0 }, { color: "#FF9900", offset: 0.2 }, { color: "#ADFF2F", offset: 0.4 }, { color: "#7DF9FF", offset: 0.6 }, { color: "#B44FFF", offset: 0.8 }, { color: "#FF6EE7", offset: 1 }] },
  { label: "Dusk",    angle: 135, stops: [{ color: "#0f0c29", offset: 0 }, { color: "#302b63", offset: 0.5 }, { color: "#24243e", offset: 1 }] },
  { label: "Mono",    angle: 90,  stops: [{ color: "#000000", offset: 0 }, { color: "#888888", offset: 1 }] },
];

// Row-major 3×3 angle grid; null = center placeholder
const ANGLE_GRID: Array<[number | null, string]> = [
  [315, "↖"], [0, "↑"],   [45, "↗"],
  [270, "←"], [null, ""], [90, "→"],
  [225, "↙"], [180, "↓"], [135, "↘"],
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5 mt-3 first:mt-0 select-none">{children}</p>;
}

function initStops(gradient: TextGradient | null): GStop[] {
  if (!gradient?.stops?.length) return [mkStop("#FF6EE7", 0), mkStop("#B44FFF", 1)];
  return gradient.stops.map(s => mkStop(s.color, s.offset));
}

// ── Props & Component ────────────────────────────────────────────────────────
interface ColorPopoverProps {
  color: string;
  gradient?: TextGradient | null;
  fabricRef?: React.MutableRefObject<Canvas | null>;
  onColorChange: (c: string) => void;
  onGradientChange?: (g: TextGradient | null) => void;
  onClose: () => void;
  /** Optional override for the popover's inline positioning styles */
  anchorStyle?: React.CSSProperties;
}

export default function ColorPopover({ color, gradient = null, fabricRef, onColorChange, onGradientChange, onClose, anchorStyle }: ColorPopoverProps) {
  const showGradientTab = typeof onGradientChange === "function";
  const [tab, setTab] = useState<"solid" | "gradient">(gradient && showGradientTab ? "gradient" : "solid");

  // ── Gradient state ───────────────────────────────────────────────────────
  const [stops, setStops] = useState<GStop[]>(() => initStops(gradient));
  const [angle, setAngle] = useState(gradient?.angle ?? 90);
  const [selectedId, setSelectedId] = useState<string | null>(() => initStops(gradient)[0]?.id ?? null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Click-outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // ── Gradient helpers ─────────────────────────────────────────────────────
  const emit = useCallback((s: GStop[], a: number) => {
    onGradientChange?.(toTextGradient(s, a));
  }, [onGradientChange]);

  const setAndEmit = (s: GStop[]) => { setStops(s); emit(s, angle); };
  const setAngleAndEmit = (a: number) => { setAngle(a); emit(stops, a); };

  // ── Document colors — computed once on open, memoized ───────────────────
  const docColors = useMemo(() => {
    const fc = fabricRef?.current;
    if (!fc) return [] as string[];
    const seen = new Set<string>();
    fc.getObjects().forEach(obj => {
      const o = obj as unknown as Record<string, unknown>;
      if (typeof o.fill === "string" && o.fill !== "transparent") seen.add(o.fill as string);
      if (typeof o.stroke === "string" && o.stroke !== "transparent") seen.add(o.stroke as string);
    });
    return [...seen].filter(Boolean).slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — compute once on mount

  // ── Stop track interaction ───────────────────────────────────────────────
  const getOffset = (clientX: number): number => {
    const t = trackRef.current;
    if (!t) return 0;
    const r = t.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    const offset = getOffset(e.clientX);
    const newStop = mkStop(colorAtOffset(stops, offset), offset);
    const next = [...stops, newStop];
    setSelectedId(newStop.id);
    setAndEmit(next);
  };

  const startDrag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    let latest = stops;
    const onMove = (me: MouseEvent) => {
      const off = getOffset(me.clientX);
      setStops(prev => { latest = prev.map(s => s.id === id ? { ...s, offset: off } : s); return latest; });
    };
    const onUp = () => {
      emit(latest, angle);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const setStopColor = (id: string, c: string) => setAndEmit(stops.map(s => s.id === id ? { ...s, color: c } : s));

  const removeStop = (id: string) => {
    if (stops.length <= 2) return;
    const next = stops.filter(s => s.id !== id);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
    setAndEmit(next);
  };

  const selectedStop = stops.find(s => s.id === selectedId) ?? null;
  const cssGrad = stopsToCSS(stops, angle);

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed top-5 left-[86px] p-3 rounded-2xl z-[300] w-64"
      style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.08)", maxHeight: "calc(100vh - 48px)", overflowY: "auto", ...anchorStyle }}
    >
      {/* ✕ close */}
      <button
        onClick={onClose}
        className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white border border-gray-200 text-gray-400 flex items-center justify-center text-xs leading-none cursor-pointer hover:text-black transition-colors"
      >✕</button>

      {/* Tab switcher — only shown when gradient is supported */}
      {showGradientTab && (
        <div className="flex gap-1 mb-3 p-0.5 bg-gray-100 rounded-xl">
          {(["solid", "gradient"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 text-xs font-semibold rounded-lg py-1 capitalize cursor-pointer transition-colors"
              style={{
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#111" : "#888",
                border: tab === t ? "1px solid rgba(0,0,0,0.08)" : "1px solid transparent",
              }}
            >{t}</button>
          ))}
        </div>
      )}

      {/* ══ SOLID TAB ══ */}
      {tab === "solid" && (
        <>
          <div className="mb-3">
            <ColorPicker
              color={color.startsWith("#") ? color : "#000000"}
              onChange={c => { onGradientChange?.(null); onColorChange(c); }}
            />
          </div>

          {/* Document colours — up to 4 */}
          {docColors.length > 0 && (
            <>
              <SectionLabel>In this document</SectionLabel>
              <div className="flex gap-2">
                {docColors.map(c => (
                  <button
                    key={c} title={c}
                    onClick={() => { onGradientChange?.(null); onColorChange(c); }}
                    className="w-7 h-7 rounded-full cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                    style={{ background: c, outline: color === c && !gradient ? "2px solid #000" : "1px solid rgba(0,0,0,0.12)", outlineOffset: color === c && !gradient ? "2px" : "0px" }}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ══ GRADIENT TAB ══ */}
      {showGradientTab && tab === "gradient" && (
        <>
          {/* Preset pills */}
          <SectionLabel>Presets</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRESETS.map(p => (
              <button
                key={p.label} title={p.label}
                onClick={() => {
                  const ns = p.stops.map(s => mkStop(s.color, s.offset));
                  setStops(ns); setAngle(p.angle); setSelectedId(ns[0].id);
                  emit(ns, p.angle);
                }}
                className="h-5 rounded-full cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                style={{
                  width: 44,
                  background: `linear-gradient(90deg, ${p.stops.map(s => `${s.color} ${s.offset * 100}%`).join(", ")})`,
                  outline: "1px solid rgba(0,0,0,0.1)",
                }}
              />
            ))}
          </div>

          {/* Live preview */}
          <div className="h-7 rounded-xl mb-1" style={{ background: cssGrad }} />

          {/* ─ Stop track ─ */}
          <SectionLabel>Stops — click track to add</SectionLabel>
          <div className="relative mb-8">
            {/* Gradient bar — click to add a stop */}
            <div
              ref={trackRef}
              onClick={handleTrackClick}
              className="h-6 rounded-xl cursor-crosshair select-none"
              style={{ background: cssGrad, border: "1px solid rgba(0,0,0,0.08)" }}
            />
            {/* Draggable stop handles */}
            {stops.map(stop => {
              const isSel = stop.id === selectedId;
              return (
                <button
                  key={stop.id}
                  onMouseDown={e => startDrag(e, stop.id)}
                  onClick={e => { e.stopPropagation(); setSelectedId(stop.id); }}
                  className="absolute cursor-grab active:cursor-grabbing"
                  style={{
                    left: `${stop.offset * 100}%`,
                    top: "100%",
                    transform: "translate(-50%, 5px)",
                    width: 16, height: 16,
                    borderRadius: "50%",
                    background: stop.color,
                    border: isSel ? "2.5px solid #000" : "2.5px solid #fff",
                    outline: isSel ? "1px solid rgba(0,0,0,0.45)" : "none",
                    zIndex: isSel ? 10 : 5,
                  }}
                />
              );
            })}
          </div>

          {/* Selected stop color editor */}
          {selectedStop && (
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-2 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Stop · {Math.round(selectedStop.offset * 100)}%
                </span>
                <button
                  onClick={() => removeStop(selectedStop.id)}
                  disabled={stops.length <= 2}
                  className="text-[11px] text-gray-300 hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                >✕ Remove</button>
              </div>
              <ColorPicker
                color={selectedStop.color}
                onChange={c => setStopColor(selectedStop.id, c)}
                squareHeight={100}
              />
            </div>
          )}

          {/* Direction */}
          <SectionLabel>Direction</SectionLabel>
          <div className="grid gap-0.5 mb-3" style={{ gridTemplateColumns: "repeat(3, 1fr)", width: "fit-content" }}>
            {ANGLE_GRID.map(([a, sym], i) => {
              if (a === null) return <div key={i} className="w-7 h-7" />;
              const active = angle === a;
              return (
                <button
                  key={a}
                  onClick={() => setAngleAndEmit(a)}
                  title={`${a}°`}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-colors select-none"
                  style={{ background: active ? "#000" : "transparent", color: active ? "#fff" : "#666" }}
                >{sym}</button>
              );
            })}
          </div>

          {/* Clear */}
          <button
            onClick={() => { onGradientChange?.(null); setTab("solid"); }}
            className="text-xs text-gray-400 hover:text-red-400 cursor-pointer transition-colors underline select-none"
          >Clear gradient</button>
        </>
      )}
    </div>,
    document.body
  );
}
