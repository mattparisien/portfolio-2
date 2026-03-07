"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { TextEffect } from "../types";

// ── Effect presets ────────────────────────────────────────────────────────────
interface EffectPreset {
  id: string;
  label: string;
  /** CSS styles on the preview "A" — approximates how the effect looks */
  preview: React.CSSProperties;
  make: (shadowColor: string, strokeColor: string, intensity: number) => TextEffect;
  hasShadow: boolean;
  hasStroke: boolean;
  defaultShadowColor: string;
  defaultStrokeColor: string;
  defaultIntensity: number;
}

const STROKE_COLORS = [
  "#000000", "#ffffff", "#ff3cac", "#784ba0", "#2b86c5",
  "#00e5ff", "#FFD700", "#ff6b6b", "#6bcb77", "#ff922b",
];

const SHADOW_COLORS = [
  "#FF6EE7", "#B44FFF", "#00F5D4", "#FFD700", "#FF4DA6",
  "#7DF9FF", "#ADFF2F", "#FF6B6B", "#0088FF", "#000000",
];

// intensity: 0–100
const PRESETS: EffectPreset[] = [
  {
    id: "glow",
    label: "Glow",
    preview: {
      textShadow: "0 0 8px #FF6EE7, 0 0 22px #B44FFF",
      color: "#FF6EE7",
    },
    make: (sc, _, i) => ({
      shadowColor: sc,
      shadowBlur: Math.round(8 + i * 0.32),
      shadowOffsetX: 0, shadowOffsetY: 0,
      strokeColor: "", strokeWidth: 0,
    }),
    hasShadow: true, hasStroke: false,
    defaultShadowColor: "#FF6EE7", defaultStrokeColor: "#000000",
    defaultIntensity: 50,
  },
  {
    id: "neon",
    label: "Neon",
    preview: {
      textShadow: "0 0 5px #00F5D4, 0 0 15px #00F5D4, 0 0 30px #0088FF",
      color: "#00F5D4",
      WebkitTextStroke: "0.5px #00F5D4",
    },
    make: (sc, _, i) => ({
      shadowColor: sc,
      shadowBlur: Math.round(12 + i * 0.38),
      shadowOffsetX: 0, shadowOffsetY: 0,
      strokeColor: sc, strokeWidth: 0.5,
    }),
    hasShadow: true, hasStroke: true,
    defaultShadowColor: "#00F5D4", defaultStrokeColor: "#00F5D4",
    defaultIntensity: 50,
  },
  {
    id: "drop-shadow",
    label: "Drop Shadow",
    preview: { textShadow: "3px 3px 5px rgba(0,0,0,0.65)" },
    make: (sc, _, i) => ({
      shadowColor: sc,
      shadowBlur: Math.round(3 + i * 0.17),
      shadowOffsetX: Math.round(1 + i * 0.05),
      shadowOffsetY: Math.round(1 + i * 0.05),
      strokeColor: "", strokeWidth: 0,
    }),
    hasShadow: true, hasStroke: false,
    defaultShadowColor: "rgba(0,0,0,0.65)", defaultStrokeColor: "#000000",
    defaultIntensity: 50,
  },
  {
    id: "hard-shadow",
    label: "Hard Shadow",
    preview: { textShadow: "3px 3px 0px #000000" },
    make: (sc, _, i) => ({
      shadowColor: sc, shadowBlur: 0,
      shadowOffsetX: Math.round(1 + i * 0.06),
      shadowOffsetY: Math.round(1 + i * 0.06),
      strokeColor: "", strokeWidth: 0,
    }),
    hasShadow: true, hasStroke: false,
    defaultShadowColor: "#000000", defaultStrokeColor: "#000000",
    defaultIntensity: 50,
  },
  {
    id: "outline",
    label: "Outline",
    preview: { WebkitTextStroke: "1.5px #000000", color: "transparent" },
    make: (_, tc, i) => ({
      shadowColor: "rgba(0,0,0,0)", shadowBlur: 0,
      shadowOffsetX: 0, shadowOffsetY: 0,
      strokeColor: tc, strokeWidth: Math.max(1, Math.round(1 + i * 0.1)),
    }),
    hasShadow: false, hasStroke: true,
    defaultShadowColor: "#000000", defaultStrokeColor: "#000000",
    defaultIntensity: 30,
  },
  {
    id: "thick-outline",
    label: "Chunky",
    preview: {
      WebkitTextStroke: "3px #FF4DA6",
      color: "white",
      textShadow: "none",
    },
    make: (_, tc, i) => ({
      shadowColor: "rgba(0,0,0,0)", shadowBlur: 0,
      shadowOffsetX: 0, shadowOffsetY: 0,
      strokeColor: tc, strokeWidth: Math.max(2, Math.round(3 + i * 0.12)),
    }),
    hasShadow: false, hasStroke: true,
    defaultShadowColor: "#000000", defaultStrokeColor: "#FF4DA6",
    defaultIntensity: 40,
  },
  {
    id: "glitter",
    label: "Glitter ✦",
    preview: {
      textShadow: "0 0 6px #FFD700, 0 0 16px #FF6EE7",
      WebkitTextStroke: "0.5px #FFD700",
      color: "#FFD700",
    },
    make: (sc, tc, i) => ({
      shadowColor: sc,
      shadowBlur: Math.round(8 + i * 0.22),
      shadowOffsetX: 0, shadowOffsetY: 0,
      strokeColor: tc, strokeWidth: Math.max(0.5, 0.5 + i * 0.01),
      patternType: "glitter" as const,
      patternColor1: sc,
      patternColor2: tc,
    }),
    hasShadow: true, hasStroke: true,
    defaultShadowColor: "#FF6EE7", defaultStrokeColor: "#FFD700",
    defaultIntensity: 55,
  },
  {
    id: "retro",
    label: "Retro",
    preview: {
      textShadow: "3px 3px 0 #FF4DA6",
      WebkitTextStroke: "1px #000000",
    },
    make: (sc, tc, i) => ({
      shadowColor: sc, shadowBlur: 0,
      shadowOffsetX: Math.round(2 + i * 0.04),
      shadowOffsetY: Math.round(2 + i * 0.04),
      strokeColor: tc, strokeWidth: Math.max(1, Math.round(1 + i * 0.04)),
    }),
    hasShadow: true, hasStroke: true,
    defaultShadowColor: "#FF4DA6", defaultStrokeColor: "#000000",
    defaultIntensity: 50,
  },
  {
    id: "dream",
    label: "Dream Blur",
    preview: {
      textShadow: "0 0 18px #B44FFF, 0 0 34px #FF6EE7",
      color: "#B44FFF",
    },
    make: (sc, _, i) => ({
      shadowColor: sc,
      shadowBlur: Math.round(18 + i * 0.42),
      shadowOffsetX: 0, shadowOffsetY: 0,
      strokeColor: "", strokeWidth: 0,
    }),
    hasShadow: true, hasStroke: false,
    defaultShadowColor: "#B44FFF", defaultStrokeColor: "#000000",
    defaultIntensity: 40,
  },
  {
    id: "fire",
    label: "Fire 🔥",
    preview: {
      textShadow: "0 0 8px #FF6B6B, 0 0 20px #FFD93D, 0 0 40px #FF4DA6",
      color: "#FFD93D",
    },
    make: (sc, _, i) => ({
      shadowColor: sc,
      shadowBlur: Math.round(14 + i * 0.26),
      shadowOffsetX: 0, shadowOffsetY: 0,
      strokeColor: "", strokeWidth: 0,
    }),
    hasShadow: true, hasStroke: false,
    defaultShadowColor: "#FF6B6B", defaultStrokeColor: "#FFD93D",
    defaultIntensity: 55,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5 mt-2.5 first:mt-0 select-none">
      {children}
    </p>
  );
}

function SwatchRow({
  colors, selected, onSelect,
}: {
  colors: string[];
  selected: string;
  onSelect: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 mb-1">
      {colors.map(c => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className="w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
          style={{
            background: c,
            boxShadow: selected === c
              ? "0 0 0 2px #fff, 0 0 0 3.5px #000"
              : "0 0 0 1px rgba(0,0,0,0.15)",
          }}
        />
      ))}
      {/* Custom picker */}
      <label
        className="w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
        style={{ background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)" }}
      >
        <input
          type="color"
          value={selected.startsWith("#") ? selected : "#FF6EE7"}
          onChange={e => onSelect(e.target.value)}
          className="opacity-0 w-0 h-0 absolute pointer-events-none"
          tabIndex={-1}
        />
      </label>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
interface TextEffectsPopoverProps {
  effect: TextEffect | null;
  onApply: (e: TextEffect | null) => void;
  onClose: () => void;
}

export default function TextEffectsPopover({ effect, onApply, onClose }: TextEffectsPopoverProps) {
  const [activeId, setActiveId] = useState<string | null>(effect?.presetId ?? null);
  const [shadowColor, setShadowColor] = useState("#FF6EE7");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [intensity, setIntensity] = useState(50);

  const popoverRef = useRef<HTMLDivElement>(null);
  const activePreset = PRESETS.find(p => p.id === activeId) ?? null;

  // Seed state from current effect on mount
  useEffect(() => {
    if (!effect) return;
    setShadowColor(effect.shadowColor || "#FF6EE7");
    setStrokeColor(effect.strokeColor || "#000000");
    const i = Math.min(100, Math.round(effect.shadowBlur * 1.5 + effect.strokeWidth * 10));
    setIntensity(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click-outside closes
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const applyPreset = (
    preset: EffectPreset,
    sc = shadowColor,
    tc = strokeColor,
    i = intensity,
  ) => {
    setActiveId(preset.id);
    onApply({ ...preset.make(sc, tc, i), presetId: preset.id });
  };

  const updateShadowColor = (sc: string) => {
    setShadowColor(sc);
    if (activePreset) applyPreset(activePreset, sc, strokeColor, intensity);
  };

  const updateStrokeColor = (tc: string) => {
    setStrokeColor(tc);
    if (activePreset) applyPreset(activePreset, shadowColor, tc, intensity);
  };

  const updateIntensity = (i: number) => {
    setIntensity(i);
    if (activePreset) applyPreset(activePreset, shadowColor, strokeColor, i);
  };

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed top-5 left-[86px] p-3 rounded-2xl z-[300] w-64"
      style={{
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(0,0,0,0.08)",
        maxHeight: "calc(100vh - 48px)",
        overflowY: "auto",
      }}
    >
      {/* ✕ close */}
      <button
        onClick={onClose}
        className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white text-gray-400 flex items-center justify-center text-[10px] leading-none cursor-pointer hover:text-black transition-colors"
      >✕</button>

      {/* Preset grid — 2 columns */}
      <SectionLabel>Effects</SectionLabel>
      <div className="grid grid-cols-2 gap-1.5 mb-1">
        {PRESETS.map(p => {
          const isActive = activeId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                setShadowColor(p.defaultShadowColor);
                setStrokeColor(p.defaultStrokeColor);
                setIntensity(p.defaultIntensity);
                applyPreset(p, p.defaultShadowColor, p.defaultStrokeColor, p.defaultIntensity);
              }}
              className="flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl cursor-pointer transition-all select-none"
              style={{
                background: isActive ? "#111" : "rgba(0,0,0,0.04)",
                border: isActive ? "none" : "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <span
                className="text-2xl font-extrabold leading-none select-none"
                style={{
                  ...p.preview,
                  color: isActive
                    ? (p.preview.color ?? "#fff")
                    : (p.preview.color ?? "#222"),
                  transition: "none",
                  lineHeight: 1.4,
                }}
              >
                A
              </span>
              <span
                className="text-[9px] font-semibold select-none leading-none"
                style={{ color: isActive ? "rgba(255,255,255,0.75)" : "#666" }}
              >
                {p.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Customise active preset ── */}
      {activePreset && (
        <>
          <SectionLabel>Customise</SectionLabel>

          {/* Intensity */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[9px] text-gray-400 w-12 flex-shrink-0 select-none">Intensity</span>
            <input
              type="range" min={0} max={100} value={intensity}
              onChange={e => updateIntensity(Number(e.target.value))}
              className="flex-1 cursor-pointer h-1.5 accent-black"
            />
            <span className="text-[9px] tabular-nums w-7 text-right text-gray-500 select-none">{intensity}</span>
          </div>

          {/* Shadow / glow color */}
          {activePreset.hasShadow && (
            <>
              <p className="text-[9px] text-gray-400 mb-1 select-none">
                {activePreset.id === "drop-shadow" || activePreset.id === "hard-shadow" ? "Shadow color" : "Glow color"}
              </p>
              <SwatchRow
                colors={SHADOW_COLORS}
                selected={shadowColor}
                onSelect={updateShadowColor}
              />
            </>
          )}

          {/* Stroke color */}
          {activePreset.hasStroke && (
            <>
              <p className="text-[9px] text-gray-400 mb-1 mt-2 select-none">Stroke / outline color</p>
              <SwatchRow
                colors={STROKE_COLORS}
                selected={strokeColor}
                onSelect={updateStrokeColor}
              />
            </>
          )}
        </>
      )}

      {/* Clear */}
      {(effect || activeId) && (
        <button
          onClick={() => { setActiveId(null); onApply(null); }}
          className="text-[10px] text-gray-400 hover:text-red-400 cursor-pointer transition-colors underline select-none mt-2 block"
        >
          Clear effect
        </button>
      )}
    </div>,
    document.body
  );
}
