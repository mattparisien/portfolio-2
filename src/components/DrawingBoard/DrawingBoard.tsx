"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Canvas, PencilBrush, IText, Point, Rect, Circle, Triangle, Path, FabricImage } from "fabric";
import Toolbar from "./components/Toolbar";
import BoardHeader from "./components/BoardHeader";
import DrawingTools from "./components/DrawingTools";
import { BOARD_ID, BG_COLOR } from "./constants";
import type { Tool, ShapeType } from "./types";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

type FabricMods = {
  Canvas: typeof Canvas;
  PencilBrush: typeof PencilBrush;
  IText: typeof IText;
  Point: typeof Point;
  Rect: typeof Rect;
  Circle: typeof Circle;
  Triangle: typeof Triangle;
  Path: typeof Path;
  FabricImage: typeof FabricImage;
  util: (typeof import("fabric"))["util"];
};

export default function DrawingBoard() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const modsRef = useRef<FabricMods | null>(null);

  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [isSyncing, setIsSyncing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [hasSelection, setHasSelection] = useState(false);

  const toolRef = useRef<Tool>("select");
  const colorRef = useRef("#000000");
  const brushSizeRef = useRef(5);
  toolRef.current = tool;
  colorRef.current = color;
  brushSizeRef.current = brushSize;

  // ── Animated GIF render loop ───────────────────────────────────────────────
  // The browser advances <img> GIF frames automatically; we just need to keep
  // calling requestRenderAll() so Fabric repaints each frame onto the canvas.
  const gifCountRef = useRef(0);
  const gifRafRef = useRef<number | null>(null);

  const startGifLoop = useCallback(() => {
    if (gifRafRef.current !== null) return;
    const loop = () => {
      fabricRef.current?.requestRenderAll();
      gifRafRef.current = requestAnimationFrame(loop);
    };
    gifRafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopGifLoop = useCallback(() => {
    if (gifRafRef.current !== null) {
      cancelAnimationFrame(gifRafRef.current);
      gifRafRef.current = null;
    }
  }, []);

  const saveObject = useCallback((obj: { toObject: () => object } & { boardObjectId?: string; giphyId?: string }) => {
    // Stamp a stable ID the first time this object is saved
    if (!obj.boardObjectId) {
      (obj as Record<string, unknown>).boardObjectId = crypto.randomUUID();
    }
    const objectId = obj.boardObjectId as string;
    const fabricJSON = JSON.stringify({
      ...(obj.toObject()),
      boardObjectId: objectId,
      ...(obj.giphyId ? { giphyId: obj.giphyId } : {}),
    });
    fetch("/api/board-objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: BOARD_ID, objectId, fabricJSON }),
    })
      .then((r) => { if (!r.ok) throw new Error(`saveObject HTTP ${r.status}`); })
      .catch(console.error);
  }, []);

  // ── Main initialisation ────────────────────────────────────────────────────
  useEffect(() => {
    const canvasEl = canvasElRef.current;
    if (!canvasEl) return;

    type SaveableObj = { toObject: () => object; boardObjectId?: string };
    const pendingTextRef = { current: null as IText | null };
    let isEraserDown = false;
    // Stash of objects needing re-save after a multi-select transform
    let pendingMultiSave: SaveableObj[] | null = null;

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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const fc = fabricRef.current;
      if (!fc) return;
      const active = fc.getActiveObject();
      // Don't intercept while typing inside an IText
      if (!active || (active as { isEditing?: boolean }).isEditing) return;
      e.preventDefault();
      // Clear any pending multi-save so deleted objects aren't re-saved
      pendingMultiSave = null;
      const isMulti = (active as { type?: string }).type === "activeSelection";
      const members: SaveableObj[] = isMulti
        ? (active as unknown as { getObjects(): SaveableObj[] }).getObjects().slice()
        : [active as unknown as SaveableObj];
      members.forEach((obj) => {
        fc.remove(obj as unknown as Parameters<typeof fc.remove>[0]);
        const oid = (obj as { boardObjectId?: string }).boardObjectId;
        if (oid) {
          fetch(`/api/board-objects?boardId=${BOARD_ID}&objectId=${encodeURIComponent(oid)}`, {
            method: "DELETE",
          }).catch(console.error);
        }
        // If it was an animated GIF, reduce the counter and stop loop when none remain
        if ((obj as { giphyId?: string }).giphyId) {
          gifCountRef.current = Math.max(0, gifCountRef.current - 1);
          if (gifCountRef.current === 0) stopGifLoop();
        }
      });
      fc.discardActiveObject();
      fc.requestRenderAll();
    };
    window.addEventListener("keydown", handleKeyDown);

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
    import("fabric").then(({ Canvas, PencilBrush, IText, Point, Rect, Circle, Triangle, Path, FabricImage, util }) => {
      modsRef.current = { Canvas, PencilBrush, IText, Point, Rect, Circle, Triangle, Path, FabricImage, util };

      const fc = new Canvas(canvasEl, {
        width: window.innerWidth,
        height: window.innerHeight,
        isDrawingMode: false,
        selection: true,
        backgroundColor: BG_COLOR,
      });
      fabricRef.current = fc;

      // Paint background immediately — before the async fetch resolves
      fc.renderAll();

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
          (enlivened as unknown[]).forEach((obj, i) => {
            // Restore stable IDs so subsequent saves upsert instead of insert
            const src = parsed[i];
            if (src.boardObjectId) (obj as Record<string, unknown>).boardObjectId = src.boardObjectId;
            if (src.giphyId) {
              (obj as Record<string, unknown>).giphyId = src.giphyId;
              gifCountRef.current += 1;
            }
            fc.add(obj as Parameters<typeof fc.add>[0]);
          });
          // Restart animation loop if any restored objects are animated GIFs
          if (gifCountRef.current > 0) startGifLoop();
        })
        .catch((e) => console.error("Failed to load board objects", e))
        .finally(() => { setIsSyncing(false); fc.renderAll(); });

      // Persist new paths automatically
      fc.on("path:created", (e) => { saveObject(e.path); });

      // Persist shape position/transform after user moves/resizes it.
      // ActiveSelection = multi-select group: don't save the ephemeral group itself.
      // Instead, stash its members and save them individually once Fabric has
      // restored their individual transforms (which happens on selection:cleared).

      fc.on("object:modified", (e) => {
        const target = e.target;
        if (!target) return;
        if ((target as { type?: string }).type === "activeSelection") {
          pendingMultiSave = (target as unknown as { getObjects(): SaveableObj[] }).getObjects().slice();
          return;
        }
        saveObject(target);
      });

      fc.on("selection:created", () => setHasSelection(true));
      fc.on("selection:updated", () => setHasSelection(true));

      fc.on("selection:cleared", () => {
        setHasSelection(false);
        if (!pendingMultiSave) return;
        const objs = pendingMultiSave;
        pendingMultiSave = null;
        // Fabric restores individual transforms before firing selection:cleared,
        // so each object's left/top/scaleX/scaleY/angle are correct here.
        objs.forEach((obj) => saveObject(obj));
      });

      // Snap rotation to 45° increments when Shift is held
      fc.on("object:rotating", (e) => {
        if (!e.e.shiftKey || !e.target) return;
        e.target.set("angle", Math.round(e.target.angle! / 45) * 45);
      });

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

      // Double-click to edit existing text objects (works in any tool mode)
      fc.on("mouse:dblclick", (e) => {
        const target = e.target;
        if (!target || (target as { type?: string }).type !== "i-text") return;
        const txt = target as unknown as IText;
        txt.set({ editable: true });
        fc.setActiveObject(txt);
        txt.enterEditing();
        pendingTextRef.current = txt;
      });

      // Persist text when user finishes typing (Enter or click away)
      fc.on("text:editing:exited", (e) => {
        const txt = e.target as IText;
        const isNew = txt === pendingTextRef.current;
        pendingTextRef.current = null;
        // Remove new empty text objects
        if (isNew && !txt.text?.trim()) { fc.remove(txt); fc.requestRenderAll(); }
        // Save any text that has content (new or edited existing)
        else if (txt.text?.trim()) { saveObject(txt); }
        // Always return to select mode after finishing a text edit
        setTool("select");
      });
    });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      canvasEl.removeEventListener("touchstart", onTouchStart);
      canvasEl.removeEventListener("touchmove", onTouchMove);
      canvasEl.removeEventListener("touchend", onTouchEnd);
      stopGifLoop();
      fabricRef.current?.dispose();
      fabricRef.current = null;
      modsRef.current = null;
    };
  }, [saveObject, startGifLoop, stopGifLoop]);

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
    } else if (tool === "select" || tool === "shape") {
      fc.isDrawingMode = false;
      fc.selection = true;
      fc.getObjects().forEach((o) => {
        o.selectable = true;
        o.evented = true;
      });
    } else {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.discardActiveObject();
    }
    fc.defaultCursor =
      tool === "eraser" ? "cell" :
      tool === "text"   ? "text" :
      tool === "select" || tool === "shape" ? "default" :
      "crosshair";
    fc.requestRenderAll();
  }, [tool, color, brushSize]);

  // ── Add a text element at the centre of the visible viewport ─────────────
  const addText = useCallback(() => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    const vpt = fc.viewportTransform as number[];
    const cx = (window.innerWidth  / 2 - vpt[4]) / vpt[0];
    const cy = (window.innerHeight / 2 - vpt[5]) / vpt[3];

    const txt = new mods.IText("Type something", {
      left: cx,
      top: cy,
      originX: "center",
      originY: "center",
      fontSize: Math.max(brushSizeRef.current * 2, 24),
      fill: colorRef.current,
      fontFamily: "sans-serif",
      editable: true,
    });
    fc.add(txt);
    fc.setActiveObject(txt);
    txt.enterEditing();
    requestAnimationFrame(() => { txt.selectAll(); fc.requestRenderAll(); });
    fc.requestRenderAll();
    setTool("text");
  }, []);

  // ── Add a shape at the centre of the visible viewport ────────────────────
  const addShape = useCallback((shapeType: ShapeType) => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    const vpt = fc.viewportTransform as number[];
    const cx = (window.innerWidth  / 2 - vpt[4]) / vpt[0];
    const cy = (window.innerHeight / 2 - vpt[5]) / vpt[3];

    const common = {
      fill: colorRef.current,
      stroke: "transparent",
      strokeWidth: 0,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      originX: "center" as const,
      originY: "center" as const,
      left: cx,
      top: cy,
    };

    let obj;
    switch (shapeType) {
      case "rect":
        obj = new mods.Rect({ ...common, width: 140, height: 90, rx: 6, ry: 6 });
        break;
      case "circle":
        obj = new mods.Circle({ ...common, radius: 65 });
        break;
      case "triangle":
        obj = new mods.Triangle({ ...common, width: 130, height: 112 });
        break;
      case "star": {
        const s = "M 50 5 L 61 35 L 95 35 L 68 57 L 79 91 L 50 70 L 21 91 L 32 57 L 5 35 L 39 35 Z";
        obj = new mods.Path(s, { ...common });
        break;
      }
      case "heart": {
        const h = "M 50 85 C 10 60 -10 35 10 18 C 25 5 42 10 50 22 C 58 10 75 5 90 18 C 110 35 90 60 50 85 Z";
        obj = new mods.Path(h, { ...common });
        break;
      }
    }
    if (!obj) return;
    fc.add(obj);
    fc.setActiveObject(obj);
    fc.requestRenderAll();
    saveObject(obj);
    setTool("shape");
  }, [saveObject]);

  // ── Add a GIF from Giphy ───────────────────────────────────────────────────
  const addGif = useCallback((giphyId: string, url: string) => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    mods.FabricImage.fromURL(url, { crossOrigin: "anonymous" }).then((img) => {
      const vpt = fc.viewportTransform as number[];
      const cx = (window.innerWidth  / 2 - vpt[4]) / vpt[0];
      const cy = (window.innerHeight / 2 - vpt[5]) / vpt[3];
      // Scale to max 280px wide
      const scale = Math.min(1, 280 / (img.width ?? 280));
      img.set({
        left: cx,
        top: cy,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        selectable: true,
        hasControls: true,
      });
      // Stamp custom props for persistence
      (img as unknown as Record<string, unknown>).giphyId = giphyId;
      fc.add(img);
      fc.setActiveObject(img);
      fc.requestRenderAll();
      saveObject(img);
      setTool("select");
      // Start the animation loop so this GIF plays
      gifCountRef.current += 1;
      startGifLoop();
    }).catch((e) => console.error("Failed to load GIF", e));
  }, [saveObject, startGifLoop]);

  const recolorSelected = useCallback((c: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!obj) return;
    obj.set({ fill: c });
    fc.requestRenderAll();
    saveObject(obj);
  }, [saveObject]);

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
    // Stop the GIF animation loop — no GIFs left after a clear
    gifCountRef.current = 0;
    stopGifLoop();
    fetch(`/api/board-objects?boardId=${BOARD_ID}`, { method: "DELETE" }).catch(console.error);
  }, [stopGifLoop]);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ overscrollBehavior: "none" }}>
      <canvas ref={canvasElRef} className="absolute inset-0 touch-none" />
      {hasSelection && (
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
