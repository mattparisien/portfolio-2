import { useRef, useEffect } from "react";
import type { Canvas, IText } from "fabric";
import type { Tool, FabricMods } from "../types";
import type { SaveableObj } from "./useBoardSync";
import { BOARD_ID, BG_COLOR } from "../constants";
import { decodeGif } from "../gifDecoder";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

interface UseFabricCanvasOptions {
  canvasElRef: React.RefObject<HTMLCanvasElement | null>;
  fabricRef: React.MutableRefObject<Canvas | null>;
  colorRef: React.MutableRefObject<string>;
  brushSizeRef: React.MutableRefObject<number>;
  toolRef: React.MutableRefObject<Tool>;
  saveObject: (obj: SaveableObj) => void;
  startGifLoop: () => void;
  stopGifLoop: () => void;
  gifCountRef: React.MutableRefObject<number>;
  setTool: (t: Tool) => void;
  setZoom: (z: number) => void;
  setHasSelection: (v: boolean) => void;
  setIsSyncing: (v: boolean) => void;
}

/** Initialises the Fabric canvas, registers all event listeners, loads
 *  persisted board objects, and tears everything down on unmount. */
export function useFabricCanvas({
  canvasElRef,
  fabricRef,
  colorRef,
  brushSizeRef,
  toolRef,
  saveObject,
  startGifLoop,
  stopGifLoop,
  gifCountRef,
  setTool,
  setZoom,
  setHasSelection,
  setIsSyncing,
}: UseFabricCanvasOptions) {
  const modsRef = useRef<FabricMods | null>(null);

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    if (!canvasEl) return;

    const pendingTextRef = { current: null as IText | null };
    let pendingMultiSave: SaveableObj[] | null = null;

    // ── Window event handlers ──────────────────────────────────────────────
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

    const handleKeyDown = (e: KeyboardEvent) => {
      const fc = fabricRef.current;
      if (!fc) return;
      const active = fc.getActiveObject();
      // Never intercept while typing inside a text object
      if (!active || (active as { isEditing?: boolean }).isEditing) return;

      // ── Layer order: [ = send to back, ] = bring to front ─────────────
      if (e.key === "[" || e.key === "]") {
        e.preventDefault();
        const objects = fc.getObjects();
        if (e.key === "]") {
          fc.moveObjectTo(active, objects.length - 1);
        } else {
          fc.moveObjectTo(active, 0);
        }
        fc.requestRenderAll();
        saveObject(active as unknown as SaveableObj);
        return;
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;
      e.preventDefault();
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
        if ((obj as { giphyId?: string }).giphyId) {
          gifCountRef.current = Math.max(0, gifCountRef.current - 1);
          if (gifCountRef.current === 0) stopGifLoop();
        }
      });
      fc.discardActiveObject();
      fc.requestRenderAll();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);

    // ── Touch pan ─────────────────────────────────────────────────────────
    let lastTouchMid: { x: number; y: number } | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
        lastTouchMid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
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
    canvasEl.addEventListener("touchmove",  onTouchMove,  { passive: false });
    canvasEl.addEventListener("touchend",   onTouchEnd);

    // ── Fabric async init ─────────────────────────────────────────────────
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
          parsed.forEach((o) => { if (o.type === "IText" || o.type === "i-text") o.editable = false; });
          const enlivened = await util.enlivenObjects(parsed);

          // Separate GIF objects so we can re-decode them asynchronously
          const gifRestorePromises: Promise<void>[] = [];

          (enlivened as unknown[]).forEach((obj, i) => {
            const src = parsed[i];
            if (src.boardObjectId) (obj as Record<string, unknown>).boardObjectId = src.boardObjectId;

            if (src.giphyId && src._gifUrl) {
              // Stamp giphyId immediately so the loop guard recognises it
              (obj as Record<string, unknown>).giphyId = src.giphyId;
              fc.add(obj as Parameters<typeof fc.add>[0]);
              gifCountRef.current += 1;

              // Re-fetch + re-decode the GIF to restore the spritesheet & metadata
              const gifUrl = src._gifUrl as string;
              const promise = fetch(gifUrl)
                .then((r) => r.arrayBuffer())
                .then((buffer) => {
                  const { spritesheet, frameWidth, frameHeight, totalFrames, delays } = decodeGif(buffer);
                  const fabricImg = obj as unknown as {
                    setElement: (el: HTMLCanvasElement) => void;
                    set: (props: Record<string, unknown>) => void;
                    dirty: boolean;
                  };
                  fabricImg.setElement(spritesheet);
                  fabricImg.set({
                    width: frameWidth,
                    height: frameHeight,
                    cropX: 0,
                    cropY: 0,
                    objectCaching: false,
                  });
                  const o = obj as unknown as Record<string, unknown>;
                  o._gifUrl           = gifUrl;
                  o._gifSpritesheet   = spritesheet;
                  o._gifFrameWidth    = frameWidth;
                  o._gifFrameHeight   = frameHeight;
                  o._gifTotalFrames   = totalFrames;
                  o._gifDelays        = delays;
                  o._gifCurrentFrame  = 0;
                  o._gifLastFrameTime = performance.now();
                  fabricImg.dirty     = true;
                  fc.requestRenderAll();
                })
                .catch((e) => console.error("[GIF] reload failed:", e));

              gifRestorePromises.push(promise);
            } else {
              fc.add(obj as Parameters<typeof fc.add>[0]);
            }
          });

          // Start the RAF loop once all GIFs have their metadata restored
          if (gifCountRef.current > 0) {
            Promise.allSettled(gifRestorePromises).then(() => startGifLoop());
          }
        })
        .catch((e) => console.error("Failed to load board objects", e))
        .finally(() => { setIsSyncing(false); fc.renderAll(); });

      // ── Canvas events ──────────────────────────────────────────────────
      fc.on("path:created", (e) => { saveObject(e.path); });

      fc.on("object:modified", (e) => {
        const target = e.target;
        if (!target) return;
        if ((target as { type?: string }).type === "activeSelection") {
          pendingMultiSave = (target as unknown as { getObjects(): SaveableObj[] }).getObjects().slice();
          return;
        }
        saveObject(target);
      });

      fc.on("selection:created", (e) => {
        setHasSelection(true);
      });
      fc.on("selection:updated", (e) => {
        setHasSelection(true);
      });
      fc.on("selection:cleared", () => {
        setHasSelection(false);
        if (!pendingMultiSave) return;
        const objs = pendingMultiSave;
        pendingMultiSave = null;
        objs.forEach((obj) => saveObject(obj));
      });

      fc.on("object:rotating", (e) => {
        if (!e.e.shiftKey || !e.target) return;
        e.target.set("angle", Math.round(e.target.angle! / 45) * 45);
      });

      fc.on("mouse:down", (e) => {
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

      fc.on("mouse:dblclick", (e) => {
        const target = e.target;
        if (!target || (target as { type?: string }).type !== "i-text") return;
        const txt = target as unknown as IText;
        txt.set({ editable: true });
        fc.setActiveObject(txt);
        txt.enterEditing();
        pendingTextRef.current = txt;
      });

      fc.on("text:editing:exited", (e) => {
        const txt = e.target as IText;
        const isNew = txt === pendingTextRef.current;
        pendingTextRef.current = null;
        if (isNew && !txt.text?.trim()) { fc.remove(txt); fc.requestRenderAll(); }
        else if (txt.text?.trim()) { saveObject(txt); }
        setTool("select");
      });
    });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      canvasEl.removeEventListener("touchstart", onTouchStart);
      canvasEl.removeEventListener("touchmove",  onTouchMove);
      canvasEl.removeEventListener("touchend",   onTouchEnd);
      stopGifLoop();
      fabricRef.current?.dispose();
      fabricRef.current = null;
      modsRef.current   = null;
    };
  }, [canvasElRef, fabricRef, colorRef, brushSizeRef, toolRef, saveObject, startGifLoop, stopGifLoop, gifCountRef, setTool, setZoom, setHasSelection, setIsSyncing]);

  return { modsRef };
}
