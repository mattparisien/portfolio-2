"use client";

import { useEffect, useRef, useCallback } from "react";
import type { StrokeRecord, Tool } from "../types";
import { applyCtxStyles, replayStroke, clearToBackground } from "../canvasUtils";
import { BOARD_ID, BG_COLOR } from "../constants";

interface UseCanvasOptions {
  tool: Tool;
  color: string;
  brushSize: number;
  onSyncStart: () => void;
  onSyncEnd: () => void;
}

export function useCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  { tool, color, brushSize, onSyncStart, onSyncEnd }: UseCanvasOptions
) {
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Keep latest tool state accessible inside stable callbacks without re-creating them.
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  toolRef.current = tool;
  colorRef.current = color;
  brushSizeRef.current = brushSize;

  // In-memory stroke list — used to re-render on resize without a network round-trip.
  const strokesRef = useRef<StrokeRecord[]>([]);

  /** Replay all in-memory strokes onto the canvas (e.g. after resize). */
  const replayAll = useCallback((ctx: CanvasRenderingContext2D) => {
    clearToBackground(ctx);
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

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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

  /** Call this after a stroke is committed so it goes into the in-memory list. */
  const addStroke = useCallback((stroke: StrokeRecord) => {
    strokesRef.current.push(stroke);
  }, []);

  return { ctxRef, toolRef, colorRef, brushSizeRef, addStroke };
}
