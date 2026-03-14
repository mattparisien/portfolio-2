"use client";

import { useEffect, useRef, useCallback } from "react";
import type { StrokeRecord, Tool } from "../types";
import { applyCtxStyles, replayStroke, clearToBackground, getCanvasBgColor } from "../canvasUtils";
import { BOARD_ID } from "../constants";

interface UseCanvasOptions {
  tool: Tool;
  color: string;
  brushSize: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  onSyncStart: () => void;
  onSyncEnd: () => void;
}

export function useCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  { tool, color, brushSize, zoom, offsetX, offsetY, onSyncStart, onSyncEnd }: UseCanvasOptions
) {
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Keep latest tool state accessible inside stable callbacks without re-creating them.
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const zoomRef = useRef(zoom);
  const offsetXRef = useRef(offsetX);
  const offsetYRef = useRef(offsetY);
  toolRef.current = tool;
  colorRef.current = color;
  brushSizeRef.current = brushSize;
  zoomRef.current = zoom;
  offsetXRef.current = offsetX;
  offsetYRef.current = offsetY;

  // In-memory stroke list — used to re-render on resize without a network round-trip.
  const strokesRef = useRef<StrokeRecord[]>([]);

  /** Replay all in-memory strokes onto the canvas (e.g. after resize or zoom change). */
  const replayAll = useCallback((ctx: CanvasRenderingContext2D) => {
    clearToBackground(ctx);
    ctx.setTransform(zoomRef.current, 0, 0, zoomRef.current, offsetXRef.current, offsetYRef.current);
    strokesRef.current.forEach((s) => replayStroke(ctx, s));
    applyCtxStyles(ctx, toolRef.current, colorRef.current, brushSizeRef.current);
  }, []);

  /** Resize the canvas to the current viewport and re-render all strokes. */
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    // Resizing the canvas clears it — we replay from memory instead of snapshot.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    replayAll(ctx);
  }, [canvasRef, replayAll]);

  // Initialise canvas + load strokes from DB on mount.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    ctx.fillStyle = getCanvasBgColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(zoom, 0, 0, zoom, offsetX, offsetY);
    applyCtxStyles(ctx, toolRef.current, colorRef.current, brushSizeRef.current);

    onSyncStart();
    fetch(`/api/strokes?boardId=${BOARD_ID}`)
      .then((r) => r.json())
      .then(({ strokes }: { strokes: StrokeRecord[] }) => {
        if (!Array.isArray(strokes)) return;
        strokesRef.current = strokes;
        strokes.forEach((s) => replayStroke(ctx, s));
        applyCtxStyles(ctx, toolRef.current, colorRef.current, brushSizeRef.current);
      })
      .catch((e) => console.error("Failed to load strokes", e))
      .finally(onSyncEnd);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply ctx styles whenever the active tool/color/size changes.
  useEffect(() => {
    if (ctxRef.current) applyCtxStyles(ctxRef.current, tool, color, brushSize);
  }, [tool, color, brushSize]);

  // Replay everything when zoom or offset changes so content transforms correctly.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    replayAll(ctx);
  }, [zoom, offsetX, offsetY, replayAll]);

  /** Call this after a stroke is committed so it goes into the in-memory list. */
  const addStroke = useCallback((stroke: StrokeRecord) => {
    strokesRef.current.push(stroke);
  }, []);

  /** Clear both the in-memory stroke list and the canvas surface. */
  const clearStrokes = useCallback(() => {
    strokesRef.current = [];
    const ctx = ctxRef.current;
    if (ctx) clearToBackground(ctx);
  }, []);

  return { ctxRef, toolRef, colorRef, brushSizeRef, addStroke, clearStrokes };
}
