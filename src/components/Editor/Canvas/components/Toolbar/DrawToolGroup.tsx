"use client";

import { useEffect, useRef } from "react";
import type { Tool } from "../../types";
import ToolPopover from "./ToolPopover";
import { ArrowButton, ToolButton } from "./ToolButton";
import { ICON_FILL_CLASS, ICON_SIZE_CLASS, makeIcons } from "./toolConfig";
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
  const drawIcon =
    tool === "brush" && isDrawActive ? <PenIcon svgClassName={`${ICON_SIZE_CLASS} ${ICON_FILL_CLASS}`} pathClassName={ICON_FILL_CLASS} /> :
    tool === "eraser" && isDrawActive ? makeIcons(ICON_SIZE_CLASS, true).find(x => x.type === "eraser")?.icon :
    tool === "line" && isDrawActive ? makeIcons(ICON_SIZE_CLASS, true).find(x => x.type === "line")?.icon :
    makeIcons(ICON_SIZE_CLASS, isDrawActive).find(x => x.type === "pencil")?.icon;

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
      {/* <ArrowButton
        open={isOpen}
        onClick={() => (isOpen ? onClose() : onOpen())}
        ariaLabel="Drawing tools"
      /> */}
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
            icon: makeIcons("size-[13px]").find(i => i.type === t)?.icon,
            onClick: () => { onToolChange(t); onClose(); },
          }))}
        />
      )}
    </div>
  );
}
