"use client";

import { useEffect, useRef } from "react";
import { MdBrush, MdAutoFixOff } from "react-icons/md";
import type { Tool } from "../../types";
import ToolPopover from "./ToolPopover";
import { ArrowButton, ToolButton } from "./ToolButton";
import { ICON_COLOR, ICON_COLOR_ACTIVE, makeIcons } from "./toolConfig";

interface DrawToolGroupProps {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function DrawToolGroup({ tool, onToolChange, isOpen, onOpen, onClose }: DrawToolGroupProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const isDrawActive = tool === "pencil" || tool === "brush" || tool === "line" || tool === "eraser";
  const drawIconColor = isDrawActive ? ICON_COLOR_ACTIVE : ICON_COLOR;
  const drawIcon =
    tool === "brush" && isDrawActive ? <MdBrush className="w-5 h-5" /> :
    tool === "eraser" && isDrawActive ? <MdAutoFixOff className="w-5 h-5" /> :
    tool === "line" && isDrawActive ? makeIcons(drawIconColor).find(x => x.type === "line")?.icon :
    makeIcons(drawIconColor).find(x => x.type === "pencil")?.icon;

  const drawLabel =
    tool === "brush" ? "Brush" :
    tool === "eraser" ? "Eraser" :
    tool === "line" ? "Line" : "Pencil";

  return (
    <div ref={wrapRef} className="relative flex items-center">
      <ToolButton
        active={isDrawActive}
        onClick={() => { if (!isDrawActive) onToolChange("pencil"); onClose(); }}
        title={drawLabel}
      >
        {drawIcon}
      </ToolButton>
      <ArrowButton
        open={isOpen}
        onClick={() => (isOpen ? onClose() : onOpen())}
        ariaLabel="Drawing tools"
      />
      {isOpen && (
        <ToolPopover
          popoverRef={popoverRef}
          items={(
            [
              { t: "pencil" as Tool, label: "Pencil" },
              { t: "line" as Tool, label: "Line" },
              { t: "brush" as Tool, label: "Brush" },
              { t: "eraser" as Tool, label: "Eraser" },
            ] as const
          ).map(({ t, label }) => ({
            key: t,
            label,
            active: tool === t,
            icon: makeIcons(ICON_COLOR_ACTIVE).find(i => i.type === t)?.icon,
            onClick: () => { onToolChange(t); onClose(); },
          }))}
        />
      )}
    </div>
  );
}
