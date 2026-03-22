import { useEffect, useCallback, useState, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Canvas, IText } from "fabric";
import type { Tool, ShapeType, FabricMods, TextProps, TextGradient } from "../types";
import type { SaveableObj } from "./useBoardSync";
import type { RoomEvent } from "@/liveblocks.config";
import { BOARD_ID } from "../constants";
import { getCanvasBgColor, gradientCoordsFromAngle } from "../canvasUtils";
import { decodeGif } from "../gifDecoder";
import { drawAudioPlayer, PLAYER_W, PLAYER_H } from "../audioPlayerUI";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

// ── Shared gradient builder ────────────────────────────────────────────────
function buildFabricGradient(gradient: TextGradient, mods: FabricMods) {
  const { stops, angle } = gradient;
  const coords = gradientCoordsFromAngle(angle);
  return new mods.Gradient({
    type: "linear",
    gradientUnits: "percentage",
    coords,
    colorStops: stops.map(s => ({ offset: s.offset, color: s.color })),
  });
}

interface UseCanvasActionsOptions {
  fabricRef: React.MutableRefObject<Canvas | null>;
  modsRef: React.MutableRefObject<FabricMods | null>;
  colorRef: React.MutableRefObject<string>;
  brushSizeRef: React.MutableRefObject<number>;
  tool: Tool;
  color: string;
  brushSize: number;
  simplify?: number;
  saveObject: (obj: SaveableObj) => void;
  startGifLoop: () => void;
  stopGifLoop: () => void;
  gifCountRef: React.MutableRefObject<number>;
  videoCountRef?: React.MutableRefObject<number>;
  audioCountRef?: React.MutableRefObject<number>;
  setTool: (t: Tool) => void;
  setZoom: (z: number) => void;
  setVpt: (vpt: number[]) => void;
  setTextProps: Dispatch<SetStateAction<TextProps>>;
  broadcast?: (event: RoomEvent) => void;
  fillGradientRef: React.MutableRefObject<TextGradient | null>;
  shapeStrokeColorRef?: React.MutableRefObject<string>;
}

export function useCanvasActions({
  fabricRef,
  modsRef,
  colorRef,
  brushSizeRef,
  tool,
  color,
  brushSize,
  simplify = 0,
  saveObject,
  startGifLoop,
  stopGifLoop,
  gifCountRef,
  videoCountRef,
  audioCountRef,
  setTool,
  setZoom,
  setVpt,
  setTextProps,
  broadcast,
  fillGradientRef,
  shapeStrokeColorRef,
}: UseCanvasActionsOptions) {

  // ── Sync tool / color / brush → fabric ────────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;
    if (tool === "pencil") {
      fc.isDrawingMode = true;
      fc.selection = false;
      const b = new mods.PencilBrush(fc);
      // If a gradient is active, preview with the first stop color while drawing
      // (the full gradient is applied on path:created in useFabricCanvas)
      const g = fillGradientRef.current;
      b.color = g ? [...g.stops].sort((a, b) => a.offset - b.offset)[0].color : color;
      // Apply simplification (Ramer-Douglas-Peucker tolerance in px).
      // Fabric's PencilBrush runs this after the stroke is completed.
      (b as unknown as Record<string, unknown>).decimate = simplify;
      b.width = brushSize;
      fc.freeDrawingBrush = b;
    } else if (tool === "brush") {
      // Bezier pen tool — mouse handling is done by usePenTool; just configure canvas state
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.discardActiveObject();
      fc.getObjects().forEach((o) => { o.selectable = false; o.evented = false; });
    } else if (tool === "line") {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.hoverCursor = "crosshair";
      fc.discardActiveObject();
      fc.getObjects().forEach((o) => { o.selectable = false; o.evented = false; });
    } else if (tool === "select") {
      fc.isDrawingMode = false;
      fc.selection = true;
      fc.hoverCursor = "move";
      fc.getObjects().forEach((o) => { o.selectable = true; o.evented = true; });
    } else if (tool === "shape") {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.discardActiveObject();
      fc.getObjects().forEach((o) => { o.selectable = false; o.evented = false; });
    } else if (tool === "eraser") {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.discardActiveObject();
      // Keep objects evented so findTarget() can hit-test them
      fc.getObjects().forEach((o) => { o.selectable = false; o.evented = true; });
    } else {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.discardActiveObject();
    }
    fc.defaultCursor =
      tool === "text"                                    ? "text"      :
      tool === "pencil" || tool === "brush"              ? "crosshair" :
      tool === "line"                                    ? "crosshair" :
      tool === "eraser"                                  ? "crosshair"  :
      tool === "shape"                                   ? "crosshair" :
      "default";
    fc.requestRenderAll();
  }, [tool, color, brushSize, simplify, fabricRef, modsRef]);

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
      fontSize: Math.max(brushSizeRef.current * 2, 48),
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
    setTool("select");
  }, [fabricRef, modsRef, colorRef, brushSizeRef, setTool]);

  // ── Add shape ──────────────────────────────────────────────────────────
  const addShape = useCallback((shapeType: ShapeType) => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;
    const vpt = fc.viewportTransform as number[];
    const cx = (window.innerWidth  / 2 - vpt[4]) / vpt[0];
    const cy = (window.innerHeight / 2 - vpt[5]) / vpt[3];
    const strokeColor = shapeStrokeColorRef?.current ?? "transparent";
    const common = {
      fill: colorRef.current,
      stroke: strokeColor,
      strokeWidth: strokeColor === "transparent" ? 0 : 2,
      // paintFirst:'stroke' paints the stroke first then fill on top,
      // so the inner half is hidden → stroke appears fully outside the shape.
      paintFirst: "stroke" as const,
      strokeUniform: true,
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
    // Apply gradient fill if one is active
    if (fillGradientRef.current) {
      obj.set({ fill: buildFabricGradient(fillGradientRef.current, mods) });
    }
    fc.add(obj);
    fc.setActiveObject(obj);
    fc.requestRenderAll();
    saveObject(obj);
    setTool("shape");
  }, [fabricRef, modsRef, colorRef, fillGradientRef, saveObject, setTool]);

  // ── Add Image from URL ────────────────────────────────────────────────
  const addImage = useCallback(async (url: string, dropPoint?: { x: number; y: number }) => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    try {
      const img = await mods.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
      const vpt = fc.viewportTransform as number[];
      const cx = dropPoint ? (dropPoint.x - vpt[4]) / vpt[0] : (window.innerWidth  / 2 - vpt[4]) / vpt[0];
      const cy = dropPoint ? (dropPoint.y - vpt[5]) / vpt[3] : (window.innerHeight / 2 - vpt[5]) / vpt[3];
      const maxDim = 400;
      const w = img.width;
      const h = img.height;
      const scale = (w && h) ? Math.min(1, maxDim / Math.max(w, h)) : 1;

      img.set({
        left: cx,
        top:  cy,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        selectable: true,
        hasControls: true,
      });

      fc.add(img);
      fc.setActiveObject(img);
      fc.requestRenderAll();
      saveObject(img);
      setTool("select");
    } catch (e) {
      console.error("[addImage] failed to load:", e);
    }
  }, [fabricRef, modsRef, saveObject, setTool]);

  // ── Remove Background from selected image ────────────────────────────
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const removeBg = useCallback(async () => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    const active = fc.getActiveObject();
    if (!active) return;

    // Get the image src from the Fabric object
    const src = (active as unknown as { toObject(): { src?: string } }).toObject().src;
    if (!src || src.startsWith("data:") || src === "") return;

    setIsRemovingBg(true);
    try {
      const res = await fetch("/api/remove-bg", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ imageUrl: src }),
      });
      if (!res.ok) throw new Error(`remove-bg ${res.status}`);
      const { url: newUrl } = (await res.json()) as { url: string };

      // Load the new PNG via an HTMLImageElement so no crossOrigin complications
      const el = new Image();
      el.src = newUrl;
      await new Promise<void>((resolve, reject) => {
        el.onload  = () => resolve();
        el.onerror = () => reject(new Error("Failed to load remove-bg result"));
      });

      // Capture the old object's transform
      const old = active as unknown as {
        left: number; top: number; scaleX: number; scaleY: number;
        angle: number; opacity: number;
        originX: "left" | "center" | "right";
        originY: "top"  | "center" | "bottom";
        flipX: boolean; flipY: boolean;
        boardObjectId?: string; zIndex?: number;
      };

      const imgObj = new mods.FabricImage(el, {
        left:    old.left,
        top:     old.top,
        scaleX:  old.scaleX,
        scaleY:  old.scaleY,
        angle:   old.angle,
        opacity: old.opacity,
        originX: old.originX,
        originY: old.originY,
        flipX:   old.flipX,
        flipY:   old.flipY,
        selectable:  true,
        hasControls: true,
      });

      // Preserve identity on the canvas
      if (old.boardObjectId) (imgObj as unknown as Record<string, unknown>).boardObjectId = old.boardObjectId;
      if (old.zIndex !== undefined) (imgObj as unknown as Record<string, unknown>).zIndex = old.zIndex;

      fc.remove(active);
      fc.add(imgObj);
      fc.setActiveObject(imgObj);
      fc.requestRenderAll();
      saveObject(imgObj);
    } catch (e) {
      console.error("[removeBg]", e);
    } finally {
      setIsRemovingBg(false);
    }
  }, [fabricRef, modsRef, saveObject]);

  // ── Add Video (R2 URL → looping canvas object) ────────────────────────
  const addVideo = useCallback(async (url: string, dropPoint?: { x: number; y: number }) => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    try {
      const video = document.createElement("video");
      // Do NOT set crossOrigin — R2 public URLs may lack CORS headers, and we
      // only need to render frames onto canvas (no pixel read-back required).
      video.muted       = true;
      video.loop        = true;
      video.playsInline = true;
      video.src         = url;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = (ev) => {
          const err = (ev as ErrorEvent).message ?? "unknown error";
          reject(new Error(`Video failed to load: ${err}`));
        };
        video.load();
      });

      video.play().catch(() => {});

      const vpt = fc.viewportTransform as number[];
      const cx = dropPoint ? (dropPoint.x - vpt[4]) / vpt[0] : (window.innerWidth  / 2 - vpt[4]) / vpt[0];
      const cy = dropPoint ? (dropPoint.y - vpt[5]) / vpt[3] : (window.innerHeight / 2 - vpt[5]) / vpt[3];
      const w = video.videoWidth  || 640;
      const h = video.videoHeight || 360;
      const scale = Math.min(1, 400 / Math.max(w, h));

      // Set DOM size so the browser paints the correct frame dimensions
      video.width  = w;
      video.height = h;

      const imgObj = new mods.FabricImage(video as unknown as HTMLImageElement, {
        left:          cx,
        top:           cy,
        originX:       "center",
        originY:       "center",
        width:         w,
        height:        h,
        scaleX:        scale,
        scaleY:        scale,
        objectCaching: false,
        selectable:    true,
        hasControls:   true,
      });

      const o = imgObj as unknown as Record<string, unknown>;
      o._isVideo  = true;
      o._videoUrl = url;
      o._videoEl  = video;

      // Override toObject so Fabric doesn't try to serialize the video element.
      // We store _isVideo + _videoUrl so the data can be identified later.
      const _origToObject = imgObj.toObject.bind(imgObj);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (imgObj as unknown as Record<string, unknown>).toObject = (props?: any) => ({
        ..._origToObject(props),
        src: "data:,",
        _isVideo:  true,
        _videoUrl: url,
      });

      fc.add(imgObj);
      fc.setActiveObject(imgObj);
      fc.requestRenderAll();
      saveObject(imgObj);

      if (videoCountRef) videoCountRef.current += 1;
      startGifLoop(); // the same RAF loop renders video frames each tick
      setTool("select");
    } catch (e) {
      console.error("[addVideo] failed to load:", e);
    }
  }, [fabricRef, modsRef, saveObject, startGifLoop, videoCountRef, setTool]);

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

  // ── Recolor selected object (solid color) ────────────────────────────────
  const recolorSelected = useCallback((c: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!obj) return;
    // Pencil/brush paths and lines store color on `stroke`; shapes/text on `fill`
    const type = (obj as { type?: string }).type;
    if (type === "path" || type === "line") {
      obj.set({ stroke: c });
    } else {
      obj.set({ fill: c });
    }
    fc.requestRenderAll();
    saveObject(obj);
  }, [fabricRef, saveObject]);

  // ── Apply gradient fill to selected object ──────────────────────────────
  const applyFillGradient = useCallback((g: TextGradient | null) => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;
    const obj = fc.getActiveObject();
    if (!obj) return;
    const type = (obj as { type?: string }).type;
    if (!g) {
      // Clear gradient → revert to solid color
      if (type === "path" || type === "line") {
        obj.set({ stroke: colorRef.current });
      } else {
        obj.set({ fill: colorRef.current });
      }
    } else {
      const grad = buildFabricGradient(g, mods);
      if (type === "path" || type === "line") {
        obj.set({ stroke: grad });
      } else {
        obj.set({ fill: grad });
      }
    }
    fc.requestRenderAll();
    saveObject(obj);
  }, [fabricRef, modsRef, colorRef, saveObject]);

  // ── Restroke selected shape ────────────────────────────────────────────
  const restrokeSelected = useCallback((c: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!obj) return;
    const currentWidth = (obj as unknown as { strokeWidth?: number }).strokeWidth ?? 0;
    // When an object has no stroke width yet (e.g. FabricImage defaults to 0),
    // use the current brush-size slider value as the initial width so the
    // stroke is immediately visible rather than a hair-thin 0.5 px.
    const width = currentWidth > 0 ? currentWidth : brushSizeRef.current;
    obj.set({
      stroke: c,
      strokeWidth: width,
      paintFirst: "stroke",
      strokeUniform: true,
    });
    fc.requestRenderAll();
    saveObject(obj);
  }, [fabricRef, brushSizeRef, saveObject]);

  // ── Reweight selected path ────────────────────────────────────────────
  const reweightSelected = useCallback((size: number) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!obj) return;
    obj.set({ strokeWidth: size });
    fc.requestRenderAll();
    saveObject(obj);
  }, [fabricRef, saveObject]);

  // ── Reapply opacity to selected object ────────────────────────────────
  const reOpacitySelected = useCallback((v: number) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!obj) return;
    obj.set({ opacity: v });
    fc.requestRenderAll();
    saveObject(obj);
  }, [fabricRef, saveObject]);

  const reBlendModeSelected = useCallback((mode: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!obj) return;
    (obj as unknown as Record<string, unknown>).globalCompositeOperation = mode;
    obj.set({ globalCompositeOperation: mode as GlobalCompositeOperation });
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
    setVpt(fc.viewportTransform as number[]);
  }, [fabricRef, modsRef, setZoom, setVpt]);

  const zoomOut = useCallback(() => {
    const fc = fabricRef.current; const mods = modsRef.current;
    if (!fc || !mods) return;
    const z = Math.max(MIN_ZOOM, fc.getZoom() - ZOOM_STEP);
    fc.zoomToPoint(new mods.Point(window.innerWidth / 2, window.innerHeight / 2), z);
    setZoom(z);
    setVpt(fc.viewportTransform as number[]);
  }, [fabricRef, modsRef, setZoom, setVpt]);

  const zoomReset = useCallback(() => {
    const fc = fabricRef.current; const mods = modsRef.current;
    if (!fc || !mods) return;
    fc.zoomToPoint(new mods.Point(window.innerWidth / 2, window.innerHeight / 2), 1);
    setZoom(1);
    setVpt(fc.viewportTransform as number[]);
  }, [fabricRef, modsRef, setZoom, setVpt]);

  // ── Clear canvas ───────────────────────────────────────────────────────
  const clearCanvas = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.clear();
    fc.backgroundColor = getCanvasBgColor();
    fc.renderAll();
    gifCountRef.current = 0;
    if (videoCountRef) videoCountRef.current = 0;
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
    if (!obj || ((obj as { type?: string }).type !== "i-text" && (obj as { type?: string }).type !== "textbox")) return;
    const fabricUpdates: Record<string, unknown> = {};
    if (updates.fontFamily !== undefined) fabricUpdates.fontFamily = updates.fontFamily;
    if (updates.fontSize   !== undefined) fabricUpdates.fontSize   = updates.fontSize;
    if (updates.bold       !== undefined) fabricUpdates.fontWeight  = updates.bold ? "bold" : "normal";
    if (updates.italic     !== undefined) fabricUpdates.fontStyle   = updates.italic ? "italic" : "normal";
    if (updates.underline  !== undefined) fabricUpdates.underline   = updates.underline;
    if (updates.linethrough !== undefined) fabricUpdates.linethrough = updates.linethrough;
    if (updates.lineHeight  !== undefined) fabricUpdates.lineHeight  = updates.lineHeight;
    if (updates.charSpacing !== undefined) fabricUpdates.charSpacing = updates.charSpacing;
    if (updates.textAlign   !== undefined) fabricUpdates.textAlign   = updates.textAlign;

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

    // ── Gradient fill ─────────────────────────────────────────────────
    if (updates.gradient !== undefined) {
      const mods = modsRef.current;
      if (mods) {
        if (!updates.gradient) {
          obj.set({ fill: colorRef.current });
        } else {
          const { stops, angle } = updates.gradient;
          const rad = (angle * Math.PI) / 180;
          const dx = Math.sin(rad);
          const dy = -Math.cos(rad);
          const grad = new mods.Gradient({
            type: "linear",
            gradientUnits: "percentage",
            coords: { x1: 0.5 - dx * 0.5, y1: 0.5 - dy * 0.5, x2: 0.5 + dx * 0.5, y2: 0.5 + dy * 0.5 },
            colorStops: stops.map(s => ({ offset: s.offset, color: s.color })),
          });
          obj.set({ fill: grad });
        }
      }
    }

    fc.requestRenderAll();
    saveObject(obj);
    // Reflect updated props back to state
    setTextProps((prev: TextProps) => ({ ...prev, ...updates }));
  }, [fabricRef, modsRef, colorRef, saveObject, setTextProps]);

  // ── Lock / unlock selected objects ────────────────────────────────────
  const lockSelected = useCallback((locked: boolean) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.getActiveObjects().forEach((obj) => {
      obj.set({
        lockMovementX: locked,
        lockMovementY: locked,
        lockRotation:  locked,
        lockScalingX:  locked,
        lockScalingY:  locked,
        hasControls:   !locked,
      });
      saveObject(obj as unknown as SaveableObj);
    });
    fc.requestRenderAll();
  }, [fabricRef, saveObject]);

  // ── Add Audio (R2 URL → canvas-drawn player card) ─────────────────────
  const addAudio = useCallback(async (url: string, dropPoint?: { x: number; y: number }, trackName?: string) => {
    const fc = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    // Register Fabric mouse handlers the first time any audio object is added.
    // Uses a canvas property as the guard so useCanvasLoad and addAudio share state.
    const fca = fc as unknown as Record<string, unknown>;
    if (!fca._audioHandlersRegistered) {
      fca._audioHandlersRegistered = true;

      let downPos: { x: number; y: number } | null = null;

      fc.on("mouse:down", (opt) => {
        const o = opt.target as unknown as Record<string, unknown>;
        const e = opt.e as MouseEvent;
        if (o?._isAudio) downPos = { x: e.clientX, y: e.clientY };
      });

      fc.on("mouse:up", (opt) => {
        if (!downPos) return;
        const o = opt.target as unknown as Record<string, unknown>;
        if (!o?._isAudio) { downPos = null; return; }
        const e = opt.e as MouseEvent;
        const dx = e.clientX - downPos.x;
        const dy = e.clientY - downPos.y;
        downPos = null;
        if (Math.sqrt(dx * dx + dy * dy) > 5) return; // was a drag

        const br = (opt.target as import("fabric").FabricObject).getBoundingRect();
        const relPct = (e.clientX - br.left) / br.width;
        const audio = o._audioEl as HTMLAudioElement;
        const playerCanvas = o._playerCanvas as HTMLCanvasElement;

        if (relPct < 0.22) {
          // Rewind
          audio.currentTime = 0;
          drawAudioPlayer(playerCanvas, {
            trackName: o._trackName as string,
            isPlaying: o._isPlaying as boolean ?? false,
            progress: 0,
          });
        } else if (relPct > 0.78) {
          // Play / pause
          if (o._isPlaying) {
            audio.pause();
            o._isPlaying = false;
          } else {
            audio.play().catch(() => {});
            o._isPlaying = true;
          }
          drawAudioPlayer(playerCanvas, {
            trackName: o._trackName as string,
            isPlaying: o._isPlaying as boolean,
            progress: audio.duration > 0 ? audio.currentTime / audio.duration : 0,
          });
        }

        fc.requestRenderAll();
      });

      // Pause audio when object is removed from canvas
      fc.on("object:removed", (opt) => {
        const o = opt.target as unknown as Record<string, unknown>;
        if (o?._isAudio && o._audioEl) {
          (o._audioEl as HTMLAudioElement).pause();
          if (audioCountRef) audioCountRef.current = Math.max(0, audioCountRef.current - 1);
        }
      });
    }

    const resolvedTrackName = trackName ??
      decodeURIComponent(url.split("/").pop() ?? "Audio").replace(/\.(mp3|m4a|wav|ogg|aac|flac)$/i, "");

    const audio = document.createElement("audio");
    audio.src = url;
    audio.loop = true;
    audio.preload = "metadata";

    // Draw player card onto a canvas element
    const playerCanvas = document.createElement("canvas");
    playerCanvas.width  = PLAYER_W;
    playerCanvas.height = PLAYER_H;
    drawAudioPlayer(playerCanvas, { trackName: resolvedTrackName, isPlaying: false, progress: 0 });

    const vpt = fc.viewportTransform as number[];
    const cx = dropPoint ? (dropPoint.x - vpt[4]) / vpt[0] : (window.innerWidth  / 2 - vpt[4]) / vpt[0];
    const cy = dropPoint ? (dropPoint.y - vpt[5]) / vpt[3] : (window.innerHeight / 2 - vpt[5]) / vpt[3];

    const imgObj = new mods.FabricImage(playerCanvas as unknown as HTMLImageElement, {
      left:          cx,
      top:           cy,
      originX:       "center",
      originY:       "center",
      width:         PLAYER_W,
      height:        PLAYER_H,
      objectCaching: false,
      selectable:    true,
      hasControls:   true,
    });

    const o = imgObj as unknown as Record<string, unknown>;
    o._isAudio     = true;
    o._audioUrl    = url;
    o._audioEl     = audio;
    o._playerCanvas = playerCanvas;
    o._trackName   = resolvedTrackName;
    o._isPlaying   = false;

    const _origToObject = imgObj.toObject.bind(imgObj);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (imgObj as unknown as Record<string, unknown>).toObject = (props?: any) => ({
      ..._origToObject(props),
      src:       "data:,",
      _isAudio:  true,
      _audioUrl: url,
      _trackName: resolvedTrackName,
    });

    fc.add(imgObj);
    fc.setActiveObject(imgObj);
    fc.requestRenderAll();
    saveObject(imgObj);

    if (audioCountRef) audioCountRef.current += 1;
    startGifLoop();
    setTool("select");
  }, [fabricRef, modsRef, saveObject, startGifLoop, audioCountRef, setTool]);

  return { addText, addShape, addGif, addImage, addVideo, addAudio, removeBg, isRemovingBg, recolorSelected, applyFillGradient, restrokeSelected, reweightSelected, reOpacitySelected, reBlendModeSelected, lockSelected, zoomIn, zoomOut, zoomReset, clearCanvas, applyTextProp };
}
