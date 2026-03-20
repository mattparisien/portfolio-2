"use client";

import { useEffect, useState } from "react";
import type { ShapeType, Tool } from "../../types";
import ToolbarContainer from "../ToolbarContainer";
import { DrawToolGroup } from "./DrawToolGroup";
import { GifToolGroup } from "./GifToolGroup";
import { ShapeToolGroup } from "./ShapeToolGroup";
import { ToolButton } from "./ToolButton";
import { UploadButton } from "./UploadButton";
import { ICON_SIZE_CLASS, makeIcons } from "./toolConfig";

interface ToolbarProps {
  tool: Tool; 
  color: string;
  onToolChange: (t: Tool) => void;
  onAddShape: (shape: ShapeType) => void;
  onAddText: () => void;
  onAddGif: (id: string, url: string) => void;
  onAddImage?: (url: string) => void;
  onAddVideo?: (url: string) => void;
  /** The shape type currently active in the parent (set by keyboard shortcut) */
  activeShapeType?: ShapeType;
  /** Incremented by the parent whenever another component opens a popover */
  closeSignal?: number;
  /** Incremented by the parent to programmatically trigger the upload dialog */
  uploadSignal?: number;
  /** Called when this component opens any of its own popovers */
  onPopoverOpened?: () => void;
  onClearRequest?: () => void;
}

type OpenGroup = "draw" | "shape" | "gif" | null;

export default function Toolbar({
  tool,
  onToolChange,
  onAddShape,
  onAddText,
  onAddGif,
  onAddImage,
  onAddVideo,
  closeSignal,
  uploadSignal,
  activeShapeType,
  onPopoverOpened,
}: ToolbarProps) {
  const [openGroup, setOpenGroup] = useState<OpenGroup>(null);

  useEffect(() => {
    if (!closeSignal) return;
    setOpenGroup(null);
  }, [closeSignal]);

  const handleGroupOpen = (name: OpenGroup) => {
    setOpenGroup(name);
    onPopoverOpened?.();
  };

  const groupProps = (name: Exclude<OpenGroup, null>) => ({
    isOpen: openGroup === name,
    onOpen: () => handleGroupOpen(name),
    onClose: () => setOpenGroup(null),
  });

  return (
    <ToolbarContainer
      shape="edge"
      direction="vertical"
      className="fixed right-0 top-1/2 -translate-y-1/2"
    >
      <ToolButton
        active={tool === "select"}
        onClick={() => onToolChange("select")}
        title="Select"
      >
        {makeIcons(ICON_SIZE_CLASS, tool === "select").find(x => x.type === "select")?.icon}
      </ToolButton>

      <ToolButton
        active={tool === "text"}
        onClick={() => onAddText()}
        title="Text"
      >
        {makeIcons(ICON_SIZE_CLASS, tool === "text").find(x => x.type === "text")?.icon}
      </ToolButton>

      <DrawToolGroup tool={tool} onToolChange={onToolChange} {...groupProps("draw")} />

      <ShapeToolGroup
        tool={tool}
        onAddShape={onAddShape}
        activeShapeType={activeShapeType}
        {...groupProps("shape")}
      />

      <GifToolGroup onAddGif={onAddGif} {...groupProps("gif")} />

      <UploadButton onAddImage={onAddImage} onAddVideo={onAddVideo} uploadSignal={uploadSignal} />
    </ToolbarContainer>
  )
}
