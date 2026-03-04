"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Canvas, PencilBrush, IText, Point } from "fabric";
import Toolbar from "./components/Toolbar";
import BoardHeader from "./components/BoardHeader";
import { BOARD_ID, BG_COLOR } from "./constants";
import type { Tool } from "./types";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

type FabricMods = {
  Canvas: typeof Canvas;
  PencilBrush: typeof PencilBrush;
  IText: typeof IText;
  Point: typeof Point;
  util: (typeof import("fabric"))["util"];
};

export default function DrawingBoard() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const modsRef = useRef<FabricMods | null>(null);

  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [isSyncing, setIsSyncing] = useState(false);
  const [zoom, setZoom] = useState(1);

  const toolRef = useRef<Tool>("pencil");
  const colorRef = useRef("#000000");
  const brushSizeRef = useRef(5);
  toolRef.current = tool;
  colorRef.current = color;
  brushSizeRef.current = brushSize;

  const saveObject = useCallback((obj: { toObject: () => object }) => {
    fetch("/api/board-objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: BOARD_ID, fabricJSON: JSON.stringify(obj.toObject()) }),
    }).catch(console.error);
  }, []);

  // ── Main initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    const canvasEl = canvasElRef.current;
    if (!canvasEl) return;

    const pendingTextRef = { current: null as IText | null };
    let isEraserDown = false;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const fc = fabricRef.current;
      const mods = modsRef.current;
      if (!fc || !mods) return;
      if (e.ctrlKey || e.metaKey) {
        const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fc.getZoom() * (1 - e.deltaY * 0.001)));
        fc.zoomToPoint(new mods.Point(e.clientX, e.clientY), z);
        setZoom(z);
      } else {
        fc.relativePan(new mods.Point(-e.deltaX, -e.deltaY));
      }
    };
    const handleResize = () => {
      fabricRef.current?.setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("resize", handleResize);

    // Two-finger touch pan (non-passive so preventDefault works)
    let lastTouchMid: { x: number; y: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
        lastTouchMid = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length < 2 || !lastTouchMid) return;
      e.preventDefault();
      const fc = fabricRef.current; const mods = modsRef.current;
      if (!fc || !mods) return;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      fc.relativePan(new mods.Point(cx - lastTouchMid.x, cy - lastTouchMid.y));
      lastTouchMid = { x: cx, y: cy };
    };
    const onTouchEnd = () => { lastTouchMid = null; };
    canvasEl.addEventListener("touchstart", onTouchStart, { passive: false });
    canvasEl.addEventListener("touchmove", onTouchMove, { passive: false });
    canvasEl.addEventListener("touchend", onTouchEnd);

    // Async fabric setup (dynamic import = SSR safe)
    import("fabric").then(({ Canvas, PencilBrush, IText, Point, util }) => {
      modsRef.current = { Canvas, PencilBrush, IText, Point, util };

      const fc = new Canvas(canvasEl, {
        width: window.innerWidth,
        height: window.innerHeight,
        isDrawingMode: true,
        selection: false,
        backgroundColor: BG_COLOR,
      });
      fabricRef.current = fc;

      const brush = new PencilBrush(fc);
      brush.color = colorRef.current;
      brush.width = brushSizeRef.current;
      fc.freeDrawingBrush = brush;

      // Load persisted objects
      setIsSyncing(true);
      fetch(`/api/board-objects?boardId=${BOARD_ID}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then(async ({ objects }: { objects: { fabricJSON: string }[] }) => {
          if (!Array.isArray(objects) || objects.length === 0) return;
          const parsed = objects.map((o) => JSON.parse(o.fabricJSON)) as Record<string, unknown>[];
          // Prevent tap-to-edit on replayed text objects
          parsed.forEach((o) => { if (o.type === "IText" || o.type === "i-text") o.editable = false; });
          const enlivened = await util.enlivenObjects(parsed);
          (enlivened as unknown[]).forEach((obj) => fc.add(obj as Parameters<typeof fc.add>[0]));
          fc.renderAll();
        })
        .catch((e) => console.error("Failed to load board objects", e))
        .finally(() => setIsSyncing(false));

      // Persist new paths automatically
      fc.on("path:created", (e) => { saveObject(e.path); });

      fc.on("mouse:down", (e) => {
        if (toolRef.current === "eraser") {
          isEraserDown = true;
          const target = fc.findTarget(e.e) as unknown as Parameters<typeof fc.remove>[0] | undefined;
          if (target) { fc.remove(target); fc.requestRenderAll(); }
          return;
        }
        if (toolRef.current === "text") {
          const pointer = fc.getScenePoint(e.e);
          const txt = new IText("", {
            left: pointer.x,
            top: pointer.y,
            fontSize: Math.max(brushSizeRef.current * 2, 16),
            fill: colorRef.current,
            fontFamily: "sans-serif",
            editable: true,
          });
          fc.add(txt);
          fc.setActiveObject(txt);
          txt.enterEditing();
          pendingTextRef.current = txt;
        }
      });

      fc.on("mouse:move", (e) => {
        if (!isEraserDown || toolRef.current !== "eraser") return;
        const target = fc.findTarget(e.e) as unknown as Parameters<typeof fc.remove>[0] | undefined;
        if (target) { fc.remove(target); fc.requestRenderAll(); }
      });
      fc.on("mouse:up", () => { isEraserDown = false; });

      // Persist text when user finishes typing (Enter or click away)
      fc.on("text:editing:exited", (e) => {
        const txt = e.target as IText;
        if (txt !== pendingTextRef.current) return;
        pendingTextRef.current = null;
        if (!txt.text?.trim()) { fc.remove(txt); fc.requestRenderAll(); return; }
        saveObject(txt);
      });
    });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      canvasEl.removeEventListener("touchstart", onTouchStart);
      canvasEl.removeEventListener("touchmove", onTouchMove);
      canvasEl.removeEventListener("touchend", onTouchEnd);
      fabricRef.current?.dispose();
      fabricRef.current = null;
      modsRef.current = null;
    };
  }, [saveObject]);

  // ── Sync tool / color / brush → fabric ────────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;
    if (tool === "pencil") {
      fc.isDrawingMode = true;
      fc.selection = false;
      const brush = new mods.PencilBrush(fc);
      brush.color = color;
      brush.width = brushSize;
      fc.freeDrawingBrush = brush;
    } else {
      fc.isDrawingMode = false;
      fc.selection = false;
    }
    fc.defaultCursor = tool === "eraser" ? "cell" : tool === "text" ? "text" : "crosshair";
    fc.requestRenderAll();
  }, [tool, color, brushSize]);

  const zoomIn = useCallback(() => {
    const fc = fabricRef.current; const mods = modsRef.current;
    if (!fc || !mods) return;
    const z = Math.min(MAX_ZOOM, fc.getZoom() + ZOOM_STEP);
    fc.zoomToPoint(new mods.Point(window.innerWidth / 2, window.innerHeight / 2), z);
    setZoom(z);
  }, []);

  const zoomOut = useCallback(() => {
    const fc = fabricRef.current; const mods = modsRef.current;
    if (!fc || !mods) return;
    const z = Math.max(MIN_ZOOM, fc.getZoom() - ZOOM_STEP);
    fc.zoomToPoint(new mods.Point(window.innerWidth / 2, window.innerHeight / 2), z);
    setZoom(z);
  }, []);

  const clearCanvas = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.clear();
    fc.backgroundColor = BG_COLOR;
    fc.renderAll();
    fetch(`/api/board-objects?boardId=${BOARD_ID}`, { method: "DELETE" }).catch(console.error);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ overscrollBehavior: "none" }}>
      <canvas ref={canvasElRef} className="absolute inset-0 touch-none" />
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
