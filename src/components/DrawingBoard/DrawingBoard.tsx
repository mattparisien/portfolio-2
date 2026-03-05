"use client";

import { useRef, useState } from "react";
import type { Canvas } from "fabric";
import Toolbar from "./components/Toolbar";
import BoardHeader from "./components/BoardHeader";
import DrawingTools from "./components/DrawingTools";
import { useGifLoop } from "./hooks/useGifLoop";
import { useBoardSync } from "./hooks/useBoardSync";
import { useFabricCanvas } from "./hooks/useFabricCanvas";
import { useCanvasActions } from "./hooks/useCanvasActions";
import type { Tool } from "./types";

export default function DrawingBoard() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef   = useRef<Canvas | null>(null);

  const [tool, setTool]               = useState<Tool>("select");
  const [color, setColor]             = useState("#000000");
  const [brushSize, setBrushSize]     = useState(5);
  const [isSyncing, setIsSyncing]     = useState(false);
  const [zoom, setZoom]               = useState(1);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedObjType, setSelectedObjType] = useState("");
  const [cornerRadius, setCornerRadius] = useState(0);

  // Keep refs in sync so async canvas callbacks always read the latest values
  const toolRef      = useRef<Tool>("select");
  const colorRef     = useRef("#000000");
  const brushSizeRef = useRef(5);
  toolRef.current      = tool;
  colorRef.current     = color;
  brushSizeRef.current = brushSize;

  const { gifCountRef, startGifLoop, stopGifLoop } = useGifLoop(fabricRef);
  const { saveObject } = useBoardSync();

  const { modsRef } = useFabricCanvas({
    canvasElRef,
    fabricRef,
    colorRef,
    brushSizeRef,
    toolRef,
    saveObject,
    startGifLoop,
    stopGifLoop,
    gifCountRef,
    setTool,
    setZoom,
    setHasSelection,
    setSelectedObjType,
    setCornerRadius,
    setIsSyncing,
  });

  const handleCornerRadius = (radius: number) => {
    setCornerRadius(radius);
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    (obj as unknown as Record<string, unknown>).rx = radius;
    (obj as unknown as Record<string, unknown>).ry = radius;
    fabricRef.current?.requestRenderAll();
    saveObject(obj as unknown as Parameters<typeof saveObject>[0]);
  };

  const { addText, addShape, addGif, recolorSelected, zoomIn, zoomOut } =
    useCanvasActions({
      fabricRef,
      modsRef,
      colorRef,
      brushSizeRef,
      tool,
      color,
      brushSize,
      saveObject,
      startGifLoop,
      stopGifLoop,
      gifCountRef,
      setTool,
      setZoom,
    });

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ overscrollBehavior: "none" }}>
      <canvas ref={canvasElRef} className="absolute inset-0 touch-none" />
      {(hasSelection || tool === "pencil" || tool === "brush") && (
        <Toolbar
          tool={tool}
          color={color}
          brushSize={brushSize}
          zoom={zoom}
          onColorChange={setColor}
          onBrushSizeChange={setBrushSize}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onRecolorSelected={recolorSelected}
          selectedObjType={selectedObjType}
          cornerRadius={cornerRadius}
          onCornerRadiusChange={handleCornerRadius}
        />
      )}
      <DrawingTools
        tool={tool}
        color={color}
        onToolChange={setTool}
        onAddShape={addShape}
        onAddText={addText}
        onAddGif={addGif}
      />
      <BoardHeader isSyncing={isSyncing} />
    </div>
  );
}

