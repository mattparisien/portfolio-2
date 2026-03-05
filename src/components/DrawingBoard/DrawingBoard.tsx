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
    setIsSyncing,
  });

  const { addText, addShape, addGif, recolorSelected, zoomIn, zoomOut, clearCanvas } =
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
      {hasSelection && (
        <Toolbar
          color={color}
          brushSize={brushSize}
          zoom={zoom}
          onColorChange={setColor}
          onBrushSizeChange={setBrushSize}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onClear={clearCanvas}
          onRecolorSelected={recolorSelected}
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

