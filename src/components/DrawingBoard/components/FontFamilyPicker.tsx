"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MdExpandMore, MdCheck } from "react-icons/md";

interface Props {
  value: string;
  fonts: string[];
  onChange: (font: string) => void;
  /** "compact" = inline in toolbar; "full" = full-width in side panel */
  variant?: "compact" | "full";
}

function getDropdownPos(btn: HTMLButtonElement | null): React.CSSProperties {
  if (!btn) return {};
  const rect = btn.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const placeBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove;
  if (placeBelow) {
    return { top: rect.bottom + 4, left: rect.left, minWidth: Math.max(rect.width, 180) };
  }
  return {
    bottom: window.innerHeight - rect.top + 4,
    left: rect.left,
    minWidth: Math.max(rect.width, 180),
  };
}

export function FontFamilyPicker({ value, fonts, onChange, variant = "compact" }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const openPicker = useCallback(() => {
    setPos(getDropdownPos(btnRef.current));
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      // Give React a tick so click handlers on list items fire first
      setTimeout(() => {
        if (
          !btnRef.current?.contains(e.target as Node) &&
          !listRef.current?.contains(e.target as Node)
        ) {
          setOpen(false);
        }
      }, 0);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  const isCompact = variant === "compact";

  return (
    <>
      <button
        ref={btnRef}
        title="Font family"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`flex items-center gap-1 rounded-lg transition-colors hover:bg-black/[0.05] cursor-pointer select-none border-0 outline-none bg-transparent ${
          isCompact ? "px-2 py-1.5 text-xs" : "w-full px-2.5 py-1.5 text-[12px]"
        }`}
      >
        <span
          className="truncate flex-1 text-left text-gray-700 font-medium"
          style={{ fontFamily: value }}
        >
          {value}
        </span>
        <MdExpandMore
          size={14}
          className="text-gray-400 flex-shrink-0 transition-transform duration-150"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={listRef}
            onPointerDown={(e) => e.stopPropagation()}
            onWheel={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
            data-scroll-container="true"
            style={{
              position: "fixed",
              zIndex: 99999,
              ...pos,
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)",
              overflowY: "auto",
              maxHeight: 260,
              padding: 4,
              animation:
                "popover-enter 0.18s cubic-bezier(0.34,1.2,0.64,1) forwards",
            }}
          >
            {fonts.map((f) => (
              <button
                key={f}
                onClick={() => {
                  onChange(f);
                  setOpen(false);
                }}
                className="w-full px-3 py-2 text-left rounded-lg text-[13px] text-gray-800 hover:bg-black/[0.05] transition-colors cursor-pointer flex items-center justify-between gap-2"
                style={{ fontFamily: f }}
              >
                <span>{f}</span>
                {f === value && (
                  <MdCheck size={13} className="text-gray-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
