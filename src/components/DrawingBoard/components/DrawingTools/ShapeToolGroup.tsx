"use client";

import { useEffect, useRef, useState } from "react";
import { IoTriangleSharp } from "react-icons/io5";
import type { ShapeType, Tool } from "../../types";
import ToolPopover from "./ToolPopover";
import { ArrowButton, ToolButton } from "./ToolButton";
import { ICON_COLOR, ICON_COLOR_ACTIVE, SHAPES_TYPES, makeIcons } from "./toolConfig";

interface ShapeToolGroupProps {
  tool: Tool;
  onAddShape: (shape: ShapeType) => void;
  activeShapeType?: ShapeType;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function ShapeToolGroup({
  tool,
  onAddShape,
  activeShapeType,
  isOpen,
  onOpen,
  onClose,
}: ShapeToolGroupProps) {
  const [lastShape, setLastShape] = useState<ShapeType>("rect");
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync lastShape when parent activates a shape via keyboard shortcut
  useEffect(() => {
    if (tool === "shape" && activeShapeType) setLastShape(activeShapeType);
  }, [tool, activeShapeType]);

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

  const shapeIconColor = tool === "shape" ? ICON_COLOR_ACTIVE : ICON_COLOR;
  const lastShapeIcon =
    makeIcons(shapeIconColor).find(s => s.type === lastShape)?.icon ?? (
      <IoTriangleSharp className="w-5 h-5" />
    );

  return (
    <div ref={wrapRef} className="relative flex items-center">
      <ToolButton
        active={tool === "shape"}
        onClick={() => onAddShape(lastShape)}
        title={`Draw ${lastShape}`}
      >
        {lastShapeIcon}
      </ToolButton>
      <ArrowButton
        open={isOpen}
        onClick={() => (isOpen ? onClose() : onOpen())}
        ariaLabel="Shape options"
      />
      {isOpen && (
        <ToolPopover
          popoverRef={popoverRef}
          style={{ minWidth: 100 }}
          items={makeIcons(ICON_COLOR_ACTIVE, 13)
            .filter(i => SHAPES_TYPES.includes(i.type))
            .map(s => ({
              key: s.type,
              label: s.label,
              icon: s.icon,
              active: lastShape === s.type,
              onClick: () => {
                setLastShape(s.type);
                onAddShape(s.type);
                onClose();
              },
            }))}
        />
      )}
    </div>
  );
}
