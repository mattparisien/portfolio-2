"use client";

import { useState, useRef, useEffect } from "react";
import type { Canvas } from "fabric";
import type { TextGradient } from "../types";
import { COLORS } from "../constants";

const GRADIENT_PRESETS: [string, string][] = [
  ["#FF6EE7", "#B44FFF"],
  ["#B44FFF", "#7DF9FF"],
  ["#FFD700", "#FF4DA6"],
  ["#00F5D4", "#C77DFF"],
  ["#FF85A1", "#FFF01F"],
  ["#ADFF2F", "#7DF9FF"],
  ["#FF6B6B", "#FFD93D"],
  ["#000000", "#888888"],
];

interface ColorPopoverProps {
  color: string;
  gradient: TextGradient | null;
  fabricRef: React.MutableRefObject<Canvas | null>;
  onColorChange: (c: string) => void;
  onGradientChange: (g: TextGradient | null) => void;
  onClose: () => void;
}

export default function ColorPopover({
  color,
  gradient,
  fabricRef,
  onColorChange,
  onGradientChange,
  onClose,
}: ColorPopoverProps) {
  const [tab, setTab] = useState<"solid" | "gradient">(gradient ? "gradient" : "solid");
  const [g1, setG1] = useState(gradient?.color1 ?? "#FF6EE7");
  const [g2, setG2] = useState(gradient?.color2 ?? "#B44FFF");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Collect unique solid colors currently used in canvas objects
  const docColors = (() => {
    const fc = fabricRef.current;
    if (!fc) return [] as string[];
    const seen = new Set<string>();
    fc.getObjects().forEach((obj) => {
      const o = obj as unknown as Record<string, unknown>;
      if (typeof o.fill === "string" && o.fill && o.fill !== "transparent") seen.add(o.fill);
      if (typeof o.stroke === "string" && o.stroke && o.stroke !== "transparent") seen.add(o.stroke);
    });
    return [...seen].slice(0, 20);
  })();

  // Click-outside closes popover
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!popoverRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const applyGradient = (c1: string, c2: string) => {
    setG1(c1); setG2(c2);
    onGradientChange({ color1: c1, color2: c2 });
  };

  const Section = ({ label }: { label: string }) => (
    <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5 select-none">{label}</p>
  );

  return (
    <div
      ref={popoverRef}
      className="fixed top-5 left-[86px] p-3 rounded-2xl shadow-xl z-[300] w-56"
      style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)" }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-white text-gray-500 flex items-center justify-center text-[10px] leading-none cursor-pointer hover:text-black transition-colors shadow"
      >✕</button>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 p-0.5 bg-gray-100 rounded-xl">
        {(["solid", "gradient"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 text-[10px] font-semibold rounded-lg py-1 capitalize cursor-pointer transition-colors"
            style={{
              background: tab === t ? "#fff" : "transparent",
              color: tab === t ? "#111" : "#888",
              boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >{t}</button>
        ))}
      </div>

      {tab === "solid" && (
        <>
          {/* Preset swatches */}
          <Section label="Colors" />
          <div className="flex flex-wrap gap-1.5 mb-3">
            {COLORS.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => { onGradientChange(null); onColorChange(c); }}
                className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                style={{
                  background: c,
                  boxShadow: color === c && !gradient
                    ? "0 0 0 2px #fff, 0 0 0 4px #000"
                    : "0 0 0 1px rgba(0,0,0,0.12)",
                }}
              />
            ))}
            {/* Custom color picker */}
            <label
              title="Custom color"
              className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform flex-shrink-0 flex items-center justify-center"
              style={{ background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", boxShadow: "0 0 0 1px rgba(0,0,0,0.12)" }}
            >
              <input
                type="color"
                value={color}
                onChange={(e) => { onGradientChange(null); onColorChange(e.target.value); }}
                className="opacity-0 w-0 h-0 absolute pointer-events-none"
                tabIndex={-1}
              />
            </label>
          </div>

          {/* Document colors */}
          {docColors.length > 0 && (
            <>
              <Section label="Used in document" />
              <div className="flex flex-wrap gap-1.5">
                {docColors.map((c) => (
                  <button
                    key={c}
                    title={c}
                    onClick={() => { onGradientChange(null); onColorChange(c); }}
                    className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                    style={{
                      background: c,
                      boxShadow: color === c && !gradient
                        ? "0 0 0 2px #fff, 0 0 0 4px #000"
                        : "0 0 0 1px rgba(0,0,0,0.12)",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === "gradient" && (
        <>
          {/* Gradient presets */}
          <Section label="Presets" />
          <div className="flex flex-wrap gap-1.5 mb-3">
            {GRADIENT_PRESETS.map(([c1, c2]) => {
              const active = gradient?.color1 === c1 && gradient?.color2 === c2;
              return (
                <button
                  key={c1 + c2}
                  title={`${c1} → ${c2}`}
                  onClick={() => applyGradient(c1, c2)}
                  className="h-6 rounded-full cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                  style={{
                    width: 48,
                    background: `linear-gradient(to right, ${c1}, ${c2})`,
                    outline: active ? "2px solid #000" : "none",
                    outlineOffset: 2,
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
                  }}
                />
              );
            })}
          </div>

          {/* Custom gradient builder */}
          <Section label="Custom" />
          <div className="flex items-center gap-2 mb-2">
            <div
              className="flex-1 h-7 rounded-lg"
              style={{ background: `linear-gradient(to right, ${g1}, ${g2})` }}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <label
                className="w-8 h-8 rounded-full cursor-pointer hover:scale-110 transition-transform block"
                style={{ background: g1, boxShadow: "0 0 0 1.5px rgba(0,0,0,0.15), 0 0 0 3px #fff, 0 0 0 4.5px rgba(0,0,0,0.12)" }}
              >
                <input
                  type="color"
                  value={g1}
                  onChange={(e) => applyGradient(e.target.value, g2)}
                  className="opacity-0 w-0 h-0 absolute pointer-events-none"
                  tabIndex={-1}
                />
              </label>
              <span className="text-[8px] text-gray-400 select-none">Start</span>
            </div>
            <svg viewBox="0 0 20 8" width="32" height="12" className="flex-shrink-0">
              <path d="M0 4 H18 M14 1 L18 4 L14 7" stroke="#bbb" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex flex-col items-center gap-1">
              <label
                className="w-8 h-8 rounded-full cursor-pointer hover:scale-110 transition-transform block"
                style={{ background: g2, boxShadow: "0 0 0 1.5px rgba(0,0,0,0.15), 0 0 0 3px #fff, 0 0 0 4.5px rgba(0,0,0,0.12)" }}
              >
                <input
                  type="color"
                  value={g2}
                  onChange={(e) => applyGradient(g1, e.target.value)}
                  className="opacity-0 w-0 h-0 absolute pointer-events-none"
                  tabIndex={-1}
                />
              </label>
              <span className="text-[8px] text-gray-400 select-none">End</span>
            </div>
            {/* Clear gradient */}
            {gradient && (
              <button
                title="Remove gradient"
                onClick={() => { onGradientChange(null); setTab("solid"); }}
                className="ml-auto text-[10px] text-gray-400 hover:text-red-400 transition-colors cursor-pointer underline select-none"
              >Clear</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
