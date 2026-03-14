"use client";

import { useEffect, useRef } from "react";
import { MdAutoFixOff } from "react-icons/md";
import type { Tool } from "../../types";
import ToolPopover from "./ToolPopover";
import { ArrowButton, ToolButton } from "./ToolButton";
import { ICON_COLOR, ICON_COLOR_ACTIVE, ICON_SIZE, ICON_STROKE_WIDTH, makeIcons } from "./toolConfig";
import { PenIcon } from "../Icons";

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
    tool === "brush" && isDrawActive ? <PenIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={drawIconColor} /> :
    tool === "eraser" && isDrawActive ? <MdAutoFixOff className="w-5 h-5" /> :
    tool === "line" && isDrawActive ? makeIcons(drawIconColor).find(x => x.type === "line")?.icon :
    makeIcons(drawIconColor).find(x => x.type === "pencil")?.icon;

  const drawLabel =
    tool === "brush" ? "Pen" :
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
              { t: "brush" as Tool, label: "Pen" },
              { t: "eraser" as Tool, label: "Eraser" },
            ] as const
          ).map(({ t, label }) => ({
            key: t,
            label,
            active: isDrawActive ? tool === t : t === "pencil",
            icon: makeIcons(ICON_COLOR_ACTIVE, 13).find(i => i.type === t)?.icon,
            onClick: () => { onToolChange(t); onClose(); },
          }))}
        />
      )}
    </div>
  );
}
