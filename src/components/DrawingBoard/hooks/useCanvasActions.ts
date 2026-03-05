import { useEffect, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Canvas, IText } from "fabric";
import type { Tool, ShapeType, FabricMods, TextProps } from "../types";
import type { SaveableObj } from "./useBoardSync";
import type { RoomEvent } from "@/liveblocks.config";
import { BOARD_ID, BG_COLOR } from "../constants";
import { decodeGif } from "../gifDecoder";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

interface UseCanvasActionsOptions {
  fabricRef: React.MutableRefObject<Canvas | null>;
  modsRef: React.MutableRefObject<FabricMods | null>;
  colorRef: React.MutableRefObject<string>;
  brushSizeRef: React.MutableRefObject<number>;
  tool: Tool;
  color: string;
  brushSize: number;
  saveObject: (obj: SaveableObj) => void;
  startGifLoop: () => void;
  stopGifLoop: () => void;
  gifCountRef: React.MutableRefObject<number>;
  setTool: (t: Tool) => void;
  setZoom: (z: number) => void;
  setTextProps: Dispatch<SetStateAction<TextProps>>;
  broadcast?: (event: RoomEvent) => void;
}

export function useCanvasActions({
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
  setTextProps,
  broadcast,
}: UseCanvasActionsOptions) {

  // ── Sync tool / color / brush → fabric ────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;
    if (tool === "pencil" || tool === "brush") {
      fc.isDrawingMode = true;
      fc.selection = false;
      const b = new mods.PencilBrush(fc);
      b.color = color;
      if (tool === "brush") {
        // Soft round brush: wider
        b.width = brushSize * 3;
        (b as unknown as Record<string, unknown>).strokeLineCap = "round";
        (b as unknown as Record<string, unknown>).strokeLineJoin = "round";
      } else {
        b.width = brushSize;
      }
      fc.freeDrawingBrush = b;
    } else if (tool === "select" || tool === "shape") {
      fc.isDrawingMode = false;
      fc.selection = true;
      fc.getObjects().forEach((o) => { o.selectable = true; o.evented = true; });
    } else {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.discardActiveObject();
    }
    fc.defaultCursor =
      tool === "text"                       ? "text"      :
      tool === "pencil" || tool === "brush" ? "crosshair" :
      "default";
    fc.requestRenderAll();
  }, [tool, color, brushSize, fabricRef, modsRef]);

  // ── Add text ───────────────────────────────────────────────────────────
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
    fc.requestRenderAll();
    requestAnimationFrame(() => {
      txt.enterEditing();
      txt.selectAll();
      fc.requestRenderAll();
    });
    setTool("text");
  }, [fabricRef, modsRef, colorRef, brushSizeRef, setTool]);

  // ── Add shape ──────────────────────────────────────────────────────────
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
      hasBorders:  true,
      originX: "center" as const,
      originY: "center" as const,
      left: cx,
      top:  cy,
    };
    let obj;
    switch (shapeType) {
      case "rect":
        obj = new mods.Rect({ ...common, width: 140, height: 90 });
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
  }, [fabricRef, modsRef, colorRef, saveObject, setTool]);

  // ── Add GIF ────────────────────────────────────────────────────────────
  const addGif = useCallback((giphyId: string, url: string) => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buffer) => {
        const { spritesheet, frameWidth, frameHeight, totalFrames, delays } = decodeGif(buffer);

        const vpt = fc.viewportTransform as number[];
        const cx = (window.innerWidth  / 2 - vpt[4]) / vpt[0];
        const cy = (window.innerHeight / 2 - vpt[5]) / vpt[3];
        const scale = Math.min(1, 280 / frameWidth);

        const img = new mods.FabricImage(spritesheet as unknown as HTMLImageElement, {
          left: cx,
          top:  cy,
          originX: "center",
          originY: "center",
          scaleX: scale,
          scaleY: scale,
          cropX: 0,
          cropY: 0,
          width: frameWidth,
          height: frameHeight,
          objectCaching: false,
          selectable: true,
          hasControls: true,
        });

        const o = img as unknown as Record<string, unknown>;
        o.giphyId           = giphyId;
        o._gifUrl           = url;            // persisted so we can re-decode on reload
        o._gifSpritesheet   = spritesheet;    // keep canvas alive (prevents GC)
        o._gifFrameWidth    = frameWidth;
        o._gifFrameHeight   = frameHeight;
        o._gifTotalFrames   = totalFrames;
        o._gifDelays        = delays;
        o._gifCurrentFrame  = 0;
        o._gifLastFrameTime = performance.now();

        // Replace toObject so Fabric serialises a tiny placeholder instead of
        // the entire (potentially huge) spritesheet data URL.
        const BLANK_PX = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
        const _origToObject = img.toObject.bind(img);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (img as unknown as Record<string, unknown>).toObject = (props?: any) => ({
          ..._origToObject(props),
          src: BLANK_PX,
        });

        fc.add(img);
        fc.setActiveObject(img);
        fc.requestRenderAll();
        saveObject(img);
        setTool("select");
        gifCountRef.current += 1;
        startGifLoop();
      })
      .catch((e) => console.error("[GIF] failed to load:", e));
  }, [fabricRef, modsRef, saveObject, startGifLoop, gifCountRef, setTool]);

  // ── Recolor selected object ────────────────────────────────────────────
  const recolorSelected = useCallback((c: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!obj) return;
    obj.set({ fill: c });
    fc.requestRenderAll();
    saveObject(obj);
  }, [fabricRef, saveObject]);

  // ── Zoom ───────────────────────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    const fc = fabricRef.current; const mods = modsRef.current;
    if (!fc || !mods) return;
    const z = Math.min(MAX_ZOOM, fc.getZoom() + ZOOM_STEP);
    fc.zoomToPoint(new mods.Point(window.innerWidth / 2, window.innerHeight / 2), z);
    setZoom(z);
  }, [fabricRef, modsRef, setZoom]);

  const zoomOut = useCallback(() => {
    const fc = fabricRef.current; const mods = modsRef.current;
    if (!fc || !mods) return;
    const z = Math.max(MIN_ZOOM, fc.getZoom() - ZOOM_STEP);
    fc.zoomToPoint(new mods.Point(window.innerWidth / 2, window.innerHeight / 2), z);
    setZoom(z);
  }, [fabricRef, modsRef, setZoom]);

  // ── Clear canvas ───────────────────────────────────────────────────────
  const clearCanvas = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.clear();
    fc.backgroundColor = BG_COLOR;
    fc.renderAll();
    gifCountRef.current = 0;
    stopGifLoop();
    fetch(`/api/board-objects?boardId=${BOARD_ID}`, { method: "DELETE" })
      .then(() => broadcast?.({ type: "CANVAS_CLEARED" }))
      .catch(console.error);
  }, [fabricRef, gifCountRef, stopGifLoop, broadcast]);

  // ── Apply text property to active IText ───────────────────────────────
  const applyTextProp = useCallback((updates: Partial<TextProps>) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject() as IText | null;
    if (!obj || (obj as { type?: string }).type !== "i-text") return;

    const fabricUpdates: Record<string, unknown> = {};
    if (updates.fontFamily !== undefined) fabricUpdates.fontFamily = updates.fontFamily;
    if (updates.fontSize   !== undefined) fabricUpdates.fontSize   = updates.fontSize;
    if (updates.bold       !== undefined) fabricUpdates.fontWeight  = updates.bold ? "bold" : "normal";
    if (updates.italic     !== undefined) fabricUpdates.fontStyle   = updates.italic ? "italic" : "normal";
    if (updates.underline  !== undefined) fabricUpdates.underline   = updates.underline;
    if (updates.linethrough !== undefined) fabricUpdates.linethrough = updates.linethrough;
    if (updates.lineHeight !== undefined) fabricUpdates.lineHeight  = updates.lineHeight;
    if (updates.charSpacing !== undefined) fabricUpdates.charSpacing = updates.charSpacing;

    if (updates.uppercase !== undefined) {
      const current = obj.text ?? "";
      const wasUppercase = !!(obj as unknown as Record<string, unknown>)._uppercase;
      (obj as unknown as Record<string, unknown>)._uppercase = updates.uppercase;
      if (updates.uppercase && !wasUppercase) {
        (obj as unknown as Record<string, unknown>)._originalText = current;
        fabricUpdates.text = current.toUpperCase();
      } else if (!updates.uppercase && wasUppercase) {
        fabricUpdates.text = ((obj as unknown as Record<string, unknown>)._originalText as string) ?? current.toLowerCase();
      }
    }

    obj.set(fabricUpdates as Parameters<typeof obj.set>[0]);
    fc.requestRenderAll();
    saveObject(obj);
    // Reflect updated props back to state
    setTextProps((prev: TextProps) => ({ ...prev, ...updates }));
  }, [fabricRef, saveObject, setTextProps]);

  return { addText, addShape, addGif, recolorSelected, zoomIn, zoomOut, clearCanvas, applyTextProp };
}
