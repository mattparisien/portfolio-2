"use client";

import { useRef, useCallback, useEffect } from "react";
import type { Point, Tool, StrokeRecord } from "../types";
import { BOARD_ID } from "../constants";

interface UseDrawingOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  ctxRef: React.RefObject<CanvasRenderingContext2D | null>;
  toolRef: React.RefObject<Tool>;
  colorRef: React.RefObject<string>;
  brushSizeRef: React.RefObject<number>;
  zoomRef: React.RefObject<number>;
  offsetRef: React.RefObject<{ x: number; y: number }>;
  /** Called when a stroke is finalised, before the API call. */
  onStrokeCommitted: (stroke: StrokeRecord) => void;
  /** Called when user clicks the canvas with the text tool. */
  onTextClick: (canvasPt: { x: number; y: number }, screenPt: { x: number; y: number }) => void;
}

function getPoint(
  e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement,
  zoom: number,
  offset: { x: number; y: number }
): Point {
  const rect = canvas.getBoundingClientRect();
  if ("touches" in e) {
    const touch =
      (e as TouchEvent).changedTouches?.[0] ??
      (e as React.TouchEvent).touches[0];
    return {
      x: (touch.clientX - rect.left - offset.x) / zoom,
      y: (touch.clientY - rect.top - offset.y) / zoom,
    };
  }
  const me = e as MouseEvent | React.MouseEvent;
  return {
    x: (me.clientX - rect.left - offset.x) / zoom,
    y: (me.clientY - rect.top - offset.y) / zoom,
  };
}

export function useDrawing({
  canvasRef,
  ctxRef,
  toolRef,
  colorRef,
  brushSizeRef,
  zoomRef,
  offsetRef,
  onStrokeCommitted,
  onTextClick,
}: UseDrawingOptions) {
  const isDrawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const lastMidpoint = useRef<Point | null>(null);
  const currentStrokePoints = useRef<Point[]>([]);

  /** Persist to DB and notify parent. */
  const commitStroke = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    lastMidpoint.current = null;
    ctxRef.current?.beginPath();

    const points = currentStrokePoints.current;
    currentStrokePoints.current = [];
    if (points.length === 0) return;

    const stroke: StrokeRecord = {
      tool: toolRef.current,
      color: colorRef.current,
      brushSize: brushSizeRef.current,
      points,
    };

    onStrokeCommitted(stroke);

    fetch("/api/strokes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: BOARD_ID, ...stroke }),
    }).catch((e) => console.error("Failed to save stroke", e));
  }, [ctxRef, toolRef, colorRef, brushSizeRef, onStrokeCommitted]);

  // Commit on pointer-up anywhere on the page.
  useEffect(() => {
    window.addEventListener("mouseup", commitStroke);
    window.addEventListener("touchend", commitStroke);
    return () => {
      window.removeEventListener("mouseup", commitStroke);
      window.removeEventListener("touchend", commitStroke);
    };
  }, [commitStroke]);

  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Ignore multi-touch — two-finger gesture is handled by the parent (pan).
      if ("touches" in e && (e as React.TouchEvent).touches.length > 1) return;
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;

      const pt = getPoint(e, canvas, zoomRef.current, offsetRef.current);

      // Text tool: hand off to parent to show the text input overlay.
      if (toolRef.current === "text") {
        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e
          ? (e as React.TouchEvent).touches[0].clientX
          : (e as React.MouseEvent).clientX;
        const clientY = "touches" in e
          ? (e as React.TouchEvent).touches[0].clientY
          : (e as React.MouseEvent).clientY;
        onTextClick(pt, { x: clientX - rect.left, y: clientY - rect.top });
        return;
      }

      isDrawing.current = true;
      lastPoint.current = pt;
      lastMidpoint.current = pt;
      currentStrokePoints.current = [pt];

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle =
        toolRef.current === "eraser" ? "rgba(0,0,0,1)" : colorRef.current;
      ctx.globalCompositeOperation =
        toolRef.current === "eraser" ? "destination-out" : "source-over";
      ctx.fill();
    },
    [canvasRef, ctxRef, toolRef, colorRef]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Ignore multi-touch — two-finger gesture is handled by the parent (pan).
      if ("touches" in e && (e as React.TouchEvent).touches.length > 1) return;
      if (!isDrawing.current || !ctxRef.current || !lastPoint.current || !lastMidpoint.current) return;
      e.preventDefault();
      const canvas = canvasRef.current!;
      const ctx = ctxRef.current;
      const pt = getPoint(e, canvas, zoomRef.current, offsetRef.current);

      // Midpoint between the last recorded point and the new point.
      // Drawing quadratic bezier from the previous midpoint → current midpoint
      // with the last sampled point as the control point produces a smooth
      // curve that passes through all midpoints regardless of drawing speed.
      const mid: Point = {
        x: (lastPoint.current.x + pt.x) / 2,
        y: (lastPoint.current.y + pt.y) / 2,
      };

      ctx.beginPath();
      ctx.moveTo(lastMidpoint.current.x, lastMidpoint.current.y);
      ctx.quadraticCurveTo(
        lastPoint.current.x,
        lastPoint.current.y,
        mid.x,
        mid.y
      );
      ctx.stroke();

      lastMidpoint.current = mid;
      lastPoint.current = pt;
      currentStrokePoints.current.push(pt);
    },
    [canvasRef, ctxRef]
  );

  // Resume stroke if cursor re-enters canvas while mouse is still held.
  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      if (e.buttons !== 1 || isDrawing.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      isDrawing.current = true;
      const pt = getPoint(e, canvas, zoomRef.current, offsetRef.current);
      lastPoint.current = pt;
      lastMidpoint.current = pt;
      currentStrokePoints.current = [pt];
    },
    [canvasRef]
  );

  return { startDraw, draw, handleMouseEnter };
}
