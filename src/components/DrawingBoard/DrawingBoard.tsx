"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Tool = "pencil" | "eraser";

interface Point {
  x: number;
  y: number;
}

interface StrokeRecord {
  tool: Tool;
  color: string;
  brushSize: number;
  points: Point[];
}

const BOARD_ID = "main";

const COLORS = [
  "#000000", "#ffffff", "#ff3cac", "#784ba0", "#2b86c5",
  "#00e5ff", "#ff6b6b", "#ffd93d", "#6bcb77", "#ff922b",
];

const BRUSH_SIZES = [2, 5, 10, 20, 40];

function applyCtxStyles(
  ctx: CanvasRenderingContext2D,
  t: Tool,
  c: string,
  size: number
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = t === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = c;
  ctx.lineWidth = size;
}

export default function DrawingBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [isSyncing, setIsSyncing] = useState(false);

  // Accumulates points for the stroke currently being drawn
  const currentStrokePoints = useRef<Point[]>([]);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  toolRef.current = tool;
  colorRef.current = color;
  brushSizeRef.current = brushSize;

  // Resize canvas to fill window, preserving content
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.putImageData(snapshot, 0, 0);
    applyCtxStyles(ctx, toolRef.current, colorRef.current, brushSizeRef.current);
  }, []);

  // Replay a single stored stroke onto the canvas
  const replayStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: StrokeRecord) => {
    const { tool: t, color: c, brushSize: size, points } = stroke;
    if (!points || points.length === 0) return;

    applyCtxStyles(ctx, t, c, size);
    ctx.beginPath();

    if (points.length === 1) {
      ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = t === "eraser" ? "rgba(0,0,0,1)" : c;
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = t === "eraser" ? "destination-out" : "source-over";
      ctx.fill();
      ctx.globalCompositeOperation = prev;
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  // Init canvas, then load + replay existing strokes from DB
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    // Cream white background
    ctx.fillStyle = "#f5f0e8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    applyCtxStyles(ctx, toolRef.current, colorRef.current, brushSizeRef.current);

    // Load and replay persisted strokes
    setIsSyncing(true);
    fetch(`/api/strokes?boardId=${BOARD_ID}`)
      .then((r) => r.json())
      .then(({ strokes }: { strokes: StrokeRecord[] }) => {
        if (!Array.isArray(strokes)) return;
        strokes.forEach((s) => replayStroke(ctx, s));
        // Re-apply current tool styles after replay
        applyCtxStyles(ctx, toolRef.current, colorRef.current, brushSizeRef.current);
      })
      .catch((e) => console.error("Failed to load strokes", e))
      .finally(() => setIsSyncing(false));

    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply styles when tool/color/size changes
  useEffect(() => {
    if (ctxRef.current) applyCtxStyles(ctxRef.current, tool, color, brushSize);
  }, [tool, color, brushSize]);

  // Drawing helpers
  const getPoint = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = (e as TouchEvent | React.TouchEvent).changedTouches?.[0]
        ?? (e as React.TouchEvent).touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    const me = e as MouseEvent | React.MouseEvent;
    return { x: me.clientX - rect.left, y: me.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const pt = getPoint(e);
    lastPoint.current = pt;
    currentStrokePoints.current = [pt];
    // Draw a dot on click with no movement
    const ctx = ctxRef.current!;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === "eraser" ? "rgba(0,0,0,1)" : color;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.fill();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !ctxRef.current || !lastPoint.current) return;
    e.preventDefault();
    const ctx = ctxRef.current;
    const pt = getPoint(e);

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();

    lastPoint.current = pt;
    currentStrokePoints.current.push(pt);
  };

  // Commit stroke — called on window mouseup / touchend so it always fires
  // even when the pointer is released outside the canvas.
  const commitStroke = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    ctxRef.current?.beginPath();

    const points = currentStrokePoints.current;
    currentStrokePoints.current = [];
    if (points.length === 0) return;

    fetch("/api/strokes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId: BOARD_ID,
        tool: toolRef.current,
        color: colorRef.current,
        brushSize: brushSizeRef.current,
        points,
      }),
    }).catch((e) => console.error("Failed to save stroke", e));
  }, []);

  // Attach commit listener to window so releases outside canvas are caught
  useEffect(() => {
    window.addEventListener("mouseup", commitStroke);
    window.addEventListener("touchend", commitStroke);
    return () => {
      window.removeEventListener("mouseup", commitStroke);
      window.removeEventListener("touchend", commitStroke);
    };
  }, [commitStroke]);

  // Keep drawing going when cursor re-enters canvas while still held
  const handleMouseEnter = (e: React.MouseEvent) => {
    if (e.buttons !== 1) return; // mouse button not held — nothing to resume
    if (!isDrawing.current) {
      // Re-start stroke collection without the dot flash
      isDrawing.current = true;
      const pt = getPoint(e);
      lastPoint.current = pt;
      currentStrokePoints.current = [pt];
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#f5f0e8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = prev;
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Canvas */}
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

      {/* Toolbar */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl"
        style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}
      >
        {/* Tool toggle */}
        <div className="flex gap-1 border-r border-gray-200 pr-3">
          {(["pencil", "eraser"] as Tool[]).map((t) => (
            <button
              key={t}
              title={t}
              onClick={() => setTool(t)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all"
              style={{
                background: tool === t ? "#000" : "transparent",
                color: tool === t ? "#fff" : "#000",
              }}
            >
              {t === "pencil" ? "✏️" : "🧹"}
            </button>
          ))}
        </div>

        {/* Color swatches */}
        <div className="flex gap-1.5 border-r border-gray-200 pr-3">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool("pencil"); }}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110"
              style={{
                background: c,
                border: color === c && tool === "pencil" ? "2px solid #333" : "1.5px solid #ccc",
                transform: color === c && tool === "pencil" ? "scale(1.25)" : undefined,
              }}
            />
          ))}
        </div>

        {/* Brush sizes */}
        <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
          {BRUSH_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setBrushSize(s)}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
              style={{ background: brushSize === s ? "#000" : "transparent" }}
            >
              <span
                className="rounded-full"
                style={{
                  width: Math.min(s, 24),
                  height: Math.min(s, 24),
                  background: brushSize === s ? "#fff" : "#333",
                  display: "block",
                }}
              />
            </button>
          ))}
        </div>

        {/* Clear */}
        <button
          onClick={clearCanvas}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg hover:bg-red-50 transition-colors"
          title="Clear canvas"
        >
          🗑️
        </button>
      </div>

      {/* Header label */}
      <div
        className="absolute top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm font-mono tracking-widest uppercase flex items-center gap-2"
        style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}
      >
        Queer Montréal ✦ Collective Board
        {isSyncing && (
          <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse inline-block" title="Loading board…" />
        )}
      </div>
    </div>
  );
}
