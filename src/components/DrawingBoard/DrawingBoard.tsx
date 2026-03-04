"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { Tool, StrokeRecord } from "./types";
import { useCanvas } from "./hooks/useCanvas";
import { useDrawing } from "./hooks/useDrawing";
import { BOARD_ID } from "./constants";
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
  const lastPanTouchRef = useRef<{ x: number; y: number } | null>(null);

  // Text overlay state
  const [textOverlay, setTextOverlay] = useState<{
    canvasX: number; canvasY: number;
    screenX: number; screenY: number;
    value: string;
  } | null>(null);

  const { ctxRef, toolRef, colorRef, brushSizeRef, addStroke, clearStrokes } = useCanvas(
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
    onTextClick: (canvasPt, screenPt) => {
      setTextOverlay({ canvasX: canvasPt.x, canvasY: canvasPt.y, screenX: screenPt.x, screenY: screenPt.y, value: "" });
    },
  });

  const clampZoom = (v: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +v.toFixed(2)));

  const panBy = useCallback((dx: number, dy: number) => {
    const newOffset = {
      x: offsetRef.current.x + dx,
      y: offsetRef.current.y + dy,
    };
    offsetRef.current = newOffset;
    setOffset(newOffset);
  }, []);

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

  // Wheel: Ctrl/Cmd → zoom toward cursor; plain scroll → pan
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAtPoint(zoomRef.current - e.deltaY * 0.001, e.clientX, e.clientY);
      } else {
        panBy(-e.deltaX, -e.deltaY);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [zoomAtPoint, panBy]);

  // Native (non-passive) touch listeners on the canvas so preventDefault actually
  // works — React attaches synthetic touch handlers passively in newer versions,
  // which means e.preventDefault() is silently ignored and Chrome/Safari still
  // fire back/forward swipe navigation on two-finger horizontal swipes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onNativeTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };
    const onNativeTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };

    canvas.addEventListener("touchstart", onNativeTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onNativeTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", onNativeTouchStart);
      canvas.removeEventListener("touchmove", onNativeTouchMove);
    };
  }, [canvasRef]);

  // Two-finger touch pan
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        lastPanTouchRef.current = { x: cx, y: cy };
      } else {
        startDraw(e);
      }
    },
    [startDraw]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        if (!lastPanTouchRef.current) return;
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        panBy(cx - lastPanTouchRef.current.x, cy - lastPanTouchRef.current.y);
        lastPanTouchRef.current = { x: cx, y: cy };
      } else {
        draw(e);
      }
    },
    [draw, panBy]
  );

  const clearCanvas = clearStrokes;

  const commitText = useCallback(() => {
    if (!textOverlay || !textOverlay.value.trim()) {
      setTextOverlay(null);
      return;
    }
    const stroke: StrokeRecord = {
      tool: "text",
      color: colorRef.current,
      brushSize: brushSizeRef.current,
      points: [{ x: textOverlay.canvasX, y: textOverlay.canvasY }],
      text: textOverlay.value.trim(),
      fontSize: Math.max(brushSizeRef.current, 12),
    };
    addStroke(stroke);

    // Draw immediately onto the canvas
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = stroke.color;
      ctx.font = `${stroke.fontSize}px sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(stroke.text!, stroke.points[0].x, stroke.points[0].y);
      ctx.restore();
    }

    fetch("/api/strokes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: BOARD_ID, ...stroke }),
    }).catch((e) => console.error("Failed to save text stroke", e));

    setTextOverlay(null);
  }, [textOverlay, colorRef, brushSizeRef, addStroke, ctxRef]);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ overscrollBehavior: "none" }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{ cursor: tool === "eraser" ? "cell" : tool === "text" ? "text" : "crosshair" }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseEnter={handleMouseEnter}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
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

      {/* Floating text input — shown when text tool is active and user clicks */}
      {textOverlay && (
        <div
          className="absolute pointer-events-none"
          style={{ left: textOverlay.screenX, top: textOverlay.screenY }}
        >
          <input
            autoFocus
            className="pointer-events-auto bg-transparent border-none outline-none caret-current"
            style={{
              font: `${Math.max(brushSizeRef.current, 12) * zoom}px sans-serif`,
              color: colorRef.current,
              minWidth: 4,
              width: Math.max((textOverlay.value.length + 1) * Math.max(brushSizeRef.current, 12) * 0.6 * zoom, 4),
            }}
            value={textOverlay.value}
            onChange={(e) => setTextOverlay((prev) => prev ? { ...prev, value: e.target.value } : null)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitText();
              if (e.key === "Escape") setTextOverlay(null);
            }}
            onBlur={commitText}
          />
        </div>
      )}
    </div>
  );
}

