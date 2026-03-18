"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import GifPicker from "../GifPicker";
import { ToolButton } from "./ToolButton";
import { ICON_SIZE_CLASS, POPOVER_STYLE, makeIcons } from "./toolConfig";

interface GifToolGroupProps {
  onAddGif: (id: string, url: string) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
} 

export function GifToolGroup({ onAddGif, isOpen, onOpen, onClose }: GifToolGroupProps) {
  const [gifPopoverStyle, setGifPopoverStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click-outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !wrapRef.current?.contains(e.target as Node) &&
        !popoverRef.current?.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  // Stop canvas scroll/touch handlers stealing events inside the popover
  useEffect(() => {
    const el = popoverRef.current;
    if (!el || !isOpen) return;
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener("wheel", stop, { passive: false });
    el.addEventListener("touchstart", stop, { passive: false });
    el.addEventListener("touchmove", stop, { passive: false }); 
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("touchmove", stop);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (isOpen) { onClose(); return; }
    onOpen();
    // Toolbar is a right-side vertical rail with a translateY transform, so
    // `fixed` positioning is broken inside it. Use `absolute` coords relative
    // to the wrapper instead, placing the popover to the LEFT of the toolbar.
    if (buttonRef.current && wrapRef.current) {
      const btnRect = buttonRef.current.getBoundingClientRect();
      const wrapRect = wrapRef.current.getBoundingClientRect();
      const POPOVER_W = Math.min(420, window.innerWidth - 16);
      const POPOVER_H = 460; // approx rendered height of GifPicker
      // Center popover vertically on the button, clamped to viewport
      let topRel = btnRect.top + btnRect.height / 2 - wrapRect.top - POPOVER_H / 2;
      topRel = Math.max(8 - wrapRect.top, Math.min(topRel, window.innerHeight - POPOVER_H - 8 - wrapRect.top));
      setGifPopoverStyle({ position: "absolute", right: "calc(100% + 8px)", top: topRel, width: POPOVER_W });
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <ToolButton
        active={isOpen}
        onClick={handleToggle}
        title="Add GIF or Sticker"
        btnRef={buttonRef}
        ariaExpanded={isOpen}
        activeClass="bg-black/[0.07] text-[#111]"
      >
        {makeIcons(ICON_SIZE_CLASS, isOpen).find(x => x.type === "tv")?.icon}
      </ToolButton>
      {isOpen && (
        <div
          ref={popoverRef}
          className="p-3 rounded-2xl z-[300] popover-enter-up"
          style={{ ...POPOVER_STYLE, ...gifPopoverStyle }}
        >
          <GifPicker
            onSelect={(id, url) => {
              onAddGif(id, url);
              onClose();
            }}
          />
        </div>
      )}
    </div>
  );
}
