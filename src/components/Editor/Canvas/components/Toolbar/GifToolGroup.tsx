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
    // Compute popover position in wrapper-local coords to avoid the
    // fixed-inside-transformed-ancestor bug (toolbar has translateX(-50%))
    if (buttonRef.current && wrapRef.current) {
      const btnRect = buttonRef.current.getBoundingClientRect();
      const wrapRect = wrapRef.current.getBoundingClientRect();
      const POPOVER_W = Math.min(420, window.innerWidth - 16);
      let leftRel = btnRect.left + btnRect.width / 2 - wrapRect.left - POPOVER_W / 2;
      leftRel = Math.max(
        8 - wrapRect.left,
        Math.min(leftRel, window.innerWidth - POPOVER_W - 8 - wrapRect.left)
      );
      setGifPopoverStyle({ position: "absolute", left: leftRel, bottom: "calc(100% + 8px)", width: POPOVER_W });
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
