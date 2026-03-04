"use client";

import { useRef, useState, useCallback } from "react";
import type { Tool } from "./types";
import { useCanvas } from "./hooks/useCanvas";
import { useDrawing } from "./hooks/useDrawing";
import { clearToBackground } from "./canvasUtils";
import Toolbar from "./components/Toolbar";
import BoardHeader from "./components/BoardHeader";

export default function DrawingBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [isSyncing, setIsSyncing] = useState(false);

  const { ctxRef, toolRef, colorRef, brushSizeRef, addStroke } = useCanvas(
    canvasRef,
    {
      tool,
      color,
      brushSize,
      onSyncStart: () => setIsSyncing(true),
      onSyncEnd: () => setIsSyncing(false),
    }
  );

  const { startDraw, draw, handleMouseEnter } = useDrawing({
    canvasRef,
    ctxRef,
    toolRef,
    colorRef,
    brushSizeRef,
    onStrokeCommitted: addStroke,
  });

  const clearCanvas = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx) clearToBackground(ctx);
  }, [ctxRef]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseEnter={handleMouseEnter}
        onTouchStart={startDraw}
        onTouchMove={draw}
      />

      <Toolbar
        tool={tool}
        color={color}
        brushSize={brushSize}
        onToolChange={setTool}
        onColorChange={setColor}
        onBrushSizeChange={setBrushSize}
        onClear={clearCanvas}
      />

      <BoardHeader isSyncing={isSyncing} />
    </div>
  );
}

