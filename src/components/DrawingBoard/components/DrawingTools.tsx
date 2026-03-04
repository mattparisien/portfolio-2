"use client";

import { useState, useRef, useEffect } from "react";
import type { Tool, ShapeType } from "../types";
import GifPicker from "./GifPicker";

const SHAPES: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
  {
    type: "rect",
    label: "Rectangle",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <rect x="2" y="6" width="20" height="13" rx="2" />
      </svg>
    ),
  },
  {
    type: "circle",
    label: "Circle",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    type: "triangle",
    label: "Triangle",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <polygon points="12,3 22,21 2,21" />
      </svg>
    ),
  },
  {
    type: "star",
    label: "Star",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    ),
  },
  {
    type: "heart",
    label: "Heart",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 21C12 21 3 14 3 8.5A5.5 5.5 0 0 1 12 5.1 5.5 5.5 0 0 1 21 8.5C21 14 12 21 12 21Z" />
      </svg>
    ),
  },
];

interface DrawingToolsProps {
  tool: Tool;
  color: string;
  onToolChange: (t: Tool) => void;
  onAddShape: (shape: ShapeType) => void;
  onAddText: () => void;
  onAddGif: (id: string, url: string) => void;
}

export default function DrawingTools({ tool, color, onToolChange, onAddShape, onAddText, onAddGif }: DrawingToolsProps) {
  const [shapeOpen, setShapeOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const shapeRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const gifRef = useRef<HTMLButtonElement>(null);
  const gifPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shapeOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !shapeRef.current?.contains(e.target as Node) &&
        !popoverRef.current?.contains(e.target as Node)
      ) {
        setShapeOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [shapeOpen]);

  useEffect(() => {
    if (!gifOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !gifRef.current?.contains(e.target as Node) &&
        !gifPopoverRef.current?.contains(e.target as Node)
      ) {
        setGifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [gifOpen]);

  // Stop canvas scroll/touch handlers stealing events inside GIF popover
  useEffect(() => {
    const el = gifPopoverRef.current;
    if (!el || !gifOpen) return;
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener("wheel", stop, { passive: false });
    el.addEventListener("touchstart", stop, { passive: false });
    el.addEventListener("touchmove", stop, { passive: false });
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("touchmove", stop);
    };
  }, [gifOpen]);

  const toolBtn = (
    active: boolean,
    onClick: () => void,
    title: string,
    icon: React.ReactNode,
  ) => (
    <button
      title={title}
      onClick={onClick}
      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
      style={{
        background: active ? "#000" : "transparent",
        color: active ? "#fff" : "#111",
      }}
    >
      {icon}
    </button>
  );

  return (
    <div
      className="absolute top-5 left-5 flex flex-col gap-1 p-2 rounded-2xl shadow-xl"
      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}
    >
      {/* Text */}
      {toolBtn(
        tool === "text",
        () => onAddText(),
        "Text",
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M4 6h16v2H4zM4 12h10v2H4zM4 18h7v2H4z" opacity="0" />
          <path d="M5 4v3h5.5v12h3V7H19V4z" />
        </svg>,
      )}

      {/* Draw (pencil) */}
      {toolBtn(
        tool === "pencil",
        () => onToolChange("pencil"),
        "Draw",
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 1.5H5v-.92l9.06-9.06.92.92-9.06 9.06zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>,
      )}

      {/* Shapes */}
      <div className="relative">
        <button
          ref={shapeRef}
          title="Shapes"
          onClick={() => { setShapeOpen((o) => !o); setGifOpen(false); onToolChange("shape"); }}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: tool === "shape" || shapeOpen ? "#000" : "transparent",
            color: tool === "shape" || shapeOpen ? "#fff" : "#111",
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <rect x="2" y="13" width="9" height="9" rx="1.5" />
            <circle cx="17.5" cy="17.5" r="4.5" />
            <polygon points="12,2 22,11 2,11" />
          </svg>
        </button>

        {shapeOpen && (
          <div
            ref={popoverRef}
            className="absolute top-0 left-[calc(100%+10px)] flex gap-2 p-3 rounded-2xl shadow-xl"
            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", minWidth: 220 }}
          >
            {SHAPES.map((s) => (
              <button
                key={s.type}
                title={s.label}
                onClick={() => {
                  onAddShape(s.type);
                  setShapeOpen(false);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-100 transition-colors flex-1"
                style={{ color }}
              >
                {s.icon}
                <span className="text-[10px] text-gray-500 leading-none">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GIF / Sticker picker */}
      <div className="relative">
        <button
          ref={gifRef}
          title="Add GIF or Sticker"
          onClick={() => { setGifOpen((o) => !o); setShapeOpen(false); }}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: gifOpen ? "#000" : "transparent",
            color: gifOpen ? "#fff" : "#111",
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <rect x="2" y="6" width="20" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/>
            <text x="5.5" y="15.5" fontSize="7.5" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">GIF</text>
          </svg>
        </button>

        {gifOpen && (
          <div
            ref={gifPopoverRef}
            className="absolute top-0 left-[calc(100%+10px)] p-3 rounded-2xl shadow-xl z-50"
            style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", width: 420 }}
          >
            <GifPicker
              onSelect={(id, url) => {
                onAddGif(id, url);
                setGifOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
