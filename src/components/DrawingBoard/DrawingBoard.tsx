"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { Tool } from "./types";
import { useCanvas } from "./hooks/useCanvas";
import { useDrawing } from "./hooks/useDrawing";
import { clearToBackground } from "./canvasUtils";
import Toolbar from "./components/Toolbar";
import BoardHeader from "./components/BoardHeader";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

export default function DrawingBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [isSyncing, setIsSyncing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  const { ctxRef, toolRef, colorRef, brushSizeRef, addStroke } = useCanvas(
    canvasRef,
    {
      tool,
      color,
      brushSize,
      zoom,
      offsetX: offset.x,
      offsetY: offset.y,
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
    zoomRef,
    offsetRef,
    onStrokeCommitted: addStroke,
  });

  const clampZoom = (v: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +v.toFixed(2)));

  /**
   * Zoom to `nextZoom`, keeping the canvas-space point under (pivotX, pivotY)
   * — screen coordinates relative to the viewport — fixed in place.
   */
  const zoomAtPoint = useCallback((nextZoom: number, pivotX: number, pivotY: number) => {
    const oldZoom = zoomRef.current;
    const oldOffset = offsetRef.current;
    const z = clampZoom(nextZoom);
    const ratio = z / oldZoom;
    const newOffset = {
      x: pivotX - (pivotX - oldOffset.x) * ratio,
      y: pivotY - (pivotY - oldOffset.y) * ratio,
    };
    zoomRef.current = z;
    offsetRef.current = newOffset;
    setZoom(z);
    setOffset(newOffset);
  }, []);

  const canvasCenter = useCallback(
    () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
    []
  );

  const zoomIn  = useCallback(() => {
    const c = canvasCenter();
    zoomAtPoint(zoomRef.current + ZOOM_STEP, c.x, c.y);
  }, [zoomAtPoint, canvasCenter]);

  const zoomOut = useCallback(() => {
    const c = canvasCenter();
    zoomAtPoint(zoomRef.current - ZOOM_STEP, c.x, c.y);
  }, [zoomAtPoint, canvasCenter]);

  // Ctrl/Cmd + scroll wheel zooms toward cursor
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomAtPoint(zoomRef.current - e.deltaY * 0.001, e.clientX, e.clientY);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [zoomAtPoint]);

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
        zoom={zoom}
        onToolChange={setTool}
        onColorChange={setColor}
        onBrushSizeChange={setBrushSize}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onClear={clearCanvas}
      />

      <BoardHeader isSyncing={isSyncing} />
    </div>
  );
}

