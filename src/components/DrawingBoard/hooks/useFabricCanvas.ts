import { useRef, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Canvas, IText, Textbox } from "fabric";
import type { Tool, FabricMods, TextProps, ShapeType, TextGradient } from "../types";
import { DEFAULT_TEXT_PROPS } from "../types";
import type { SaveableObj } from "./useBoardSync";
import { BOARD_ID, BG_COLOR } from "../constants";
import { decodeGif } from "../gifDecoder";
import type { RoomEvent } from "@/liveblocks.config";

// ── Ramer-Douglas-Peucker path simplification (curve-preserving) ───────────
type PathCmd = [string, ...number[]];

function autoSimplifyPath(cmds: PathCmd[], eps = 2): PathCmd[] {
  const anchors: [number, number][] = [];
  const anchorCmdIdx: number[] = [];
  const hasClosingZ = cmds.at(-1)?.[0] === "Z";

  for (let i = 0; i < cmds.length; i++) {
    const c = cmds[i];
    if      (c[0] === "M") { anchors.push([c[1], c[2]]); anchorCmdIdx.push(i); }
    else if (c[0] === "L") { anchors.push([c[1], c[2]]); anchorCmdIdx.push(i); }
    else if (c[0] === "Q") { anchors.push([c[3], c[4]]); anchorCmdIdx.push(i); }
    else if (c[0] === "C") { anchors.push([c[5], c[6]]); anchorCmdIdx.push(i); }
  }
  if (anchors.length < 2) return cmds;

  const perpDist = (p: [number, number], a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    if (!dx && !dy) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  };

  const keepSet = new Set<number>([0, anchors.length - 1]);
  const rdp = (lo: number, hi: number) => {
    if (hi - lo <= 1) return;
    let max = 0, split = lo;
    for (let i = lo + 1; i < hi; i++) {
      const d = perpDist(anchors[i], anchors[lo], anchors[hi]);
      if (d > max) { max = d; split = i; }
    }
    if (max > eps) { keepSet.add(split); rdp(lo, split); rdp(split, hi); }
  };
  rdp(0, anchors.length - 1);

  const kept = [...keepSet].sort((a, b) => a - b);

  const buildSpanCmd = (from: number, to: number): PathCmd => {
    if (to - from === 1) return [...cmds[anchorCmdIdx[to]]] as PathCmd;

    const p0 = anchors[from], p3 = anchors[to];
    const chord = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]);
    if (chord < 0.001) return ["L", p3[0], p3[1]];
    const sc = chord / 3;

    const f = cmds[anchorCmdIdx[from + 1]];
    let cp1x: number, cp1y: number;
    if (f[0] === "Q" || f[0] === "C") {
      const dx = f[1] - p0[0], dy = f[2] - p0[1];
      const l = Math.hypot(dx, dy) || chord;
      cp1x = p0[0] + (dx / l) * sc; cp1y = p0[1] + (dy / l) * sc;
    } else {
      cp1x = p0[0] + (p3[0] - p0[0]) / 3; cp1y = p0[1] + (p3[1] - p0[1]) / 3;
    }

    const lc = cmds[anchorCmdIdx[to]];
    let cp2x: number, cp2y: number;
    if (lc[0] === "Q") {
      const dx = p3[0] - lc[1], dy = p3[1] - lc[2];
      const l = Math.hypot(dx, dy) || chord;
      cp2x = p3[0] - (dx / l) * sc; cp2y = p3[1] - (dy / l) * sc;
    } else if (lc[0] === "C") {
      const dx = p3[0] - lc[3], dy = p3[1] - lc[4];
      const l = Math.hypot(dx, dy) || chord;
      cp2x = p3[0] - (dx / l) * sc; cp2y = p3[1] - (dy / l) * sc;
    } else {
      cp2x = p3[0] - (p3[0] - p0[0]) / 3; cp2y = p3[1] - (p3[1] - p0[1]) / 3;
    }

    return ["C", cp1x, cp1y, cp2x, cp2y, p3[0], p3[1]];
  };

  const out: PathCmd[] = [[...cmds[anchorCmdIdx[0]]] as PathCmd];
  for (let k = 1; k < kept.length; k++) out.push(buildSpanCmd(kept[k - 1], kept[k]));
  if (hasClosingZ) out.push(["Z"]);
  return out;
}

function extractTextProps(txt: IText): TextProps {
  const align = (txt.textAlign as string) || "left";
  const fill = txt.fill;
  let gradient: import("../types").TextGradient | null = null;
  if (fill && typeof fill === "object" && "colorStops" in fill) {
    const stops = (fill as { colorStops: { offset: number; color: string }[] }).colorStops
      .slice()
      .sort((a, b) => a.offset - b.offset);
    if (stops.length >= 2) {
      const cs = fill as { colorStops: { offset: number; color: string }[]; coords?: { x1: number; y1: number; x2: number; y2: number } };
      let angle = 90;
      if (cs.coords) {
        const { x1 = 0, y1 = 0, x2 = 1, y2 = 0 } = cs.coords;
        const deg = Math.round(Math.atan2(x2 - x1, -(y2 - y1)) * 180 / Math.PI);
        angle = (deg + 360) % 360;
      }
      gradient = { stops: stops.map(s => ({ offset: s.offset, color: s.color })), angle };
    }
  }
  return {
    fontFamily: (txt.fontFamily as string) || DEFAULT_TEXT_PROPS.fontFamily,
    fontSize: (txt.fontSize as number) || DEFAULT_TEXT_PROPS.fontSize,
    bold: txt.fontWeight === "bold" || txt.fontWeight === 700,
    italic: txt.fontStyle === "italic",
    underline: !!txt.underline,
    linethrough: !!txt.linethrough,
    uppercase: !!(txt as unknown as Record<string, unknown>)._uppercase,
    lineHeight: (txt.lineHeight as number) || DEFAULT_TEXT_PROPS.lineHeight,
    charSpacing: (txt.charSpacing as number) ?? DEFAULT_TEXT_PROPS.charSpacing,
    textAlign: (align === "center" || align === "right") ? align : "left",
    gradient,
  };
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

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
  setVpt: (vpt: number[]) => void;
  setHasSelection: (v: boolean) => void;
  setSelectedIsText: (v: boolean) => void;
  setSelectedIsGif: (v: boolean) => void;
  setSelectedIsPath: (v: boolean) => void;
  setSelectedIsLocked: (v: boolean) => void;
  setShapeStrokeColor: (c: string) => void;
  setColor: (c: string) => void;
  setBrushSize: (s: number) => void;
  setOpacity: (v: number) => void;
  opacityRef: React.MutableRefObject<number>;
  setTextProps: Dispatch<SetStateAction<TextProps>>;
  setIsSyncing: (v: boolean) => void;
  broadcast?: (event: RoomEvent) => void;
  shapeTypeRef: React.MutableRefObject<ShapeType>;
  fillGradientRef: React.MutableRefObject<TextGradient | null>;
  setIsOverHandle?: (v: boolean) => void;
  setCanvasEmpty?: (v: boolean) => void;
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
  setVpt,
  setHasSelection,
  setSelectedIsText,
  setSelectedIsGif,
  setSelectedIsPath,
  setSelectedIsLocked,
  setShapeStrokeColor,
  setColor,
  setBrushSize,
  setOpacity,
  opacityRef,
  setTextProps,
  setIsSyncing,
  broadcast,
  shapeTypeRef,
  fillGradientRef,
  setIsOverHandle,
  setCanvasEmpty,
}: UseFabricCanvasOptions) {
  const modsRef    = useRef<FabricMods | null>(null);
  const undoFnRef  = useRef<() => void>(() => {});
  const redoFnRef  = useRef<() => void>(() => {});
  type GifMeta = {
    giphyId: string; _gifUrl: string; _gifSpritesheet: HTMLCanvasElement;
    _gifFrameWidth: number; _gifFrameHeight: number;
    _gifTotalFrames: number; _gifDelays: number[];
  };
  const clipboardRef = useRef<{ clone: unknown; gifMeta?: GifMeta }[]>([]);
  const isPastingRef = useRef(false);

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    if (!canvasEl) return;

    const pendingTextRef = { current: null as IText | Textbox | null };
    let pendingMultiSave: SaveableObj[] | null = null;

    // ── Undo stack ─────────────────────────────────────────────────────────
    type UndoEntry =
      | { type: "add";    objectId: string; serialized: object }
      | { type: "delete"; serialized: object; wasGif: boolean }
      | { type: "modify"; objectId: string; before: object };
    const undoStack: UndoEntry[] = [];
    const MAX_UNDO = 50;

    type RedoEntry =
      | { type: "add";    serialized: object; wasGif: boolean }
      | { type: "delete"; objectId: string;   wasGif: boolean }
      | { type: "modify"; objectId: string;   after: object };
    const redoStack: RedoEntry[] = [];

    const pushUndo = (entry: UndoEntry) => {
      undoStack.push(entry);
      if (undoStack.length > MAX_UNDO) undoStack.shift();
      redoStack.length = 0; // any new action clears redo history
    };
    // Capture state before a user-initiated transform (move / resize / rotate)
    const beforeTransformRef = { current: null as object | null };
    const isUndoingRef = { current: false };

    // Track latest mouse screen position so 'T' can place text at cursor
    const lastMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const trackMouse = (e: MouseEvent) => { lastMouse.x = e.clientX; lastMouse.y = e.clientY; };
    window.addEventListener("mousemove", trackMouse);

    // ── Window event handlers ──────────────────────────────────────────────
    const handleWheel = (e: WheelEvent) => {
      const fc = fabricRef.current;
      const mods = modsRef.current;
      if (!fc || !mods) return;
      // If the event originated inside a scrollable UI overlay (not the canvas
      // wrapper), let the browser handle it so popovers can scroll normally.
      const canvasWrapper = canvasElRef.current?.parentElement;
      if (canvasWrapper && !canvasWrapper.contains(e.target as Node)) {
        // Only intercept if there's no scrollable ancestor between the target
        // and the document root that can absorb this scroll.
        const target = e.target as HTMLElement | null;
        let el: HTMLElement | null = target;
        while (el && el !== document.documentElement) {
          const { overflowY, overflow } = window.getComputedStyle(el);
          const scrollable = ["auto", "scroll"].includes(overflowY) || ["auto", "scroll"].includes(overflow);
          if (scrollable && el.scrollHeight > el.clientHeight) return;
          el = el.parentElement;
        }
      }
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fc.getZoom() * (1 - e.deltaY * 0.003)));
        fc.zoomToPoint(new mods.Point(e.clientX, e.clientY), z);
        setZoom(z);
        setVpt(fc.viewportTransform as number[]);
      } else {
        fc.relativePan(new mods.Point(-e.deltaX * 2, -e.deltaY * 2));
        setVpt(fc.viewportTransform as number[]);
      }
    };

    const handleResize = () => {
      fabricRef.current?.setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const fc = fabricRef.current;
      const mods = modsRef.current;
      if (!fc) return;

      const isMod = e.metaKey || e.ctrlKey;
      const active = fc.getActiveObject();
      const isEditingText = !!(active as { isEditing?: boolean } | null)?.isEditing;

      // ── Copy ──────────────────────────────────────────────────────────
      if (isMod && e.key === "c") {
        if (!active || isEditingText) return;
        e.preventDefault();
        const objs = fc.getActiveObjects();
        Promise.all(objs.map((o) => (o as unknown as { clone(): Promise<unknown> }).clone()))
          .then((clones) => {
            clipboardRef.current = clones.map((clone, i) => {
              const src = objs[i] as unknown as Record<string, unknown>;
              if (!src.giphyId) return { clone };
              return {
                clone,
                gifMeta: {
                  giphyId:          src.giphyId          as string,
                  _gifUrl:          src._gifUrl          as string,
                  _gifSpritesheet:  src._gifSpritesheet  as HTMLCanvasElement,
                  _gifFrameWidth:   src._gifFrameWidth   as number,
                  _gifFrameHeight:  src._gifFrameHeight  as number,
                  _gifTotalFrames:  src._gifTotalFrames  as number,
                  _gifDelays:       src._gifDelays       as number[],
                },
              };
            });
          });
        return;
      }

      // ── Paste ──────────────────────────────────────────────────────────
      if (isMod && e.key === "v") {
        if (!clipboardRef.current.length || !mods) return;
        if (isEditingText) return;
        e.preventDefault();
        const OFFSET = 20;
        const BLANK_PX = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
        // Clone from clipboard so we can paste multiple times
        Promise.all(clipboardRef.current.map(({ clone }) => (clone as unknown as { clone(): Promise<unknown> }).clone()))
          .then((clones) => {
            isPastingRef.current = true;
            fc.discardActiveObject();
            let hasNewGif = false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (clones as any[]).forEach((clone, i) => {
              const { gifMeta } = clipboardRef.current[i];
              // Explicitly clear the old ID so saveObject assigns a fresh UUID
              (clone as Record<string, unknown>).boardObjectId = undefined;
              clone.set({ left: (clone.left ?? 0) + OFFSET, top: (clone.top ?? 0) + OFFSET });

              // Re-attach GIF animation data
              if (gifMeta) {
                const o = clone as unknown as Record<string, unknown>;
                o.giphyId           = gifMeta.giphyId;
                o._gifUrl           = gifMeta._gifUrl;
                o._gifSpritesheet   = gifMeta._gifSpritesheet;
                o._gifFrameWidth    = gifMeta._gifFrameWidth;
                o._gifFrameHeight   = gifMeta._gifFrameHeight;
                o._gifTotalFrames   = gifMeta._gifTotalFrames;
                o._gifDelays        = gifMeta._gifDelays;
                o._gifCurrentFrame  = 0;
                o._gifLastFrameTime = performance.now();
                clone.set({ cropX: 0, objectCaching: false });
                // Point element at the shared spritesheet canvas
                (clone as unknown as { setElement: (el: HTMLCanvasElement) => void })
                  .setElement(gifMeta._gifSpritesheet);
                // Override toObject so it doesn't try to serialise the huge canvas
                const _orig = clone.toObject.bind(clone);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (clone as Record<string, unknown>).toObject = (props?: any) => ({ ..._orig(props), src: BLANK_PX });
                gifCountRef.current += 1;
                hasNewGif = true;
              }

              fc.add(clone);
              saveObject(clone as unknown as SaveableObj);
            });
            if (clones.length === 1) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              fc.setActiveObject(clones[0] as any);
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const sel = new mods.ActiveSelection(clones as any, { canvas: fc });
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              fc.setActiveObject(sel as any);
            }
            fc.requestRenderAll();
            isPastingRef.current = false;
            if (hasNewGif) startGifLoop();
          });
        return;
      }

      // ── Undo (Cmd/Ctrl+Z) ─────────────────────────────────────────────
      if (isMod && !e.shiftKey && e.key === "z") {
        if (isEditingText || !mods) return;
        e.preventDefault();
        const entry = undoStack.pop();
        if (!entry) return;
        isUndoingRef.current = true;
        if (entry.type === "add") {
          const obj = fc.getObjects().find(
            (o) => (o as unknown as { boardObjectId?: string }).boardObjectId === entry.objectId
          );
          const snap = obj ? (obj as unknown as { toObject(): object }).toObject() : entry.serialized;
          const isGif = !!(obj as { giphyId?: string } | null)?.giphyId;
          redoStack.push({ type: "add", serialized: snap, wasGif: isGif });
          if (obj) {
            fc.remove(obj);
            fc.discardActiveObject();
            fc.requestRenderAll();
          }
          if (entry.objectId) {
            fetch(`/api/board-objects?boardId=${BOARD_ID}&objectId=${encodeURIComponent(entry.objectId)}`, {
              method: "DELETE",
            })
              .then(() => broadcast?.({ type: "OBJECT_DELETED", objectId: entry.objectId }))
              .catch(console.error);
          }
        } else if (entry.type === "delete") {
          const oid = (entry.serialized as Record<string, unknown>).boardObjectId as string | undefined;
          redoStack.push({ type: "delete", objectId: oid ?? "", wasGif: entry.wasGif });
          mods.util.enlivenObjects([entry.serialized]).then((objs: unknown[]) => {
            const obj = objs[0] as unknown as SaveableObj;
            if (!obj) return;
            fc.add(obj as Parameters<typeof fc.add>[0]);
            fc.requestRenderAll();
            saveObject(obj);
            if (entry.wasGif) {
              gifCountRef.current += 1;
              startGifLoop();
            }
          }).catch(console.error);
        } else if (entry.type === "modify") {
          const obj = fc.getObjects().find(
            (o) => (o as unknown as { boardObjectId?: string }).boardObjectId === entry.objectId
          );
          if (obj) {
            const afterState = (obj as unknown as { toObject(): object }).toObject();
            redoStack.push({ type: "modify", objectId: entry.objectId, after: afterState });
            obj.set(entry.before as Parameters<typeof obj.set>[0]);
            obj.setCoords();
            fc.requestRenderAll();
            saveObject(obj as unknown as SaveableObj);
          }
        }
        isUndoingRef.current = false;
        return;
      }

      // ── Redo (Cmd/Ctrl+Shift+Z) ───────────────────────────────────────
      if (isMod && e.shiftKey && (e.key === "z" || e.key === "Z")) {
        if (isEditingText || !mods) return;
        e.preventDefault();
        const entry = redoStack.pop();
        if (!entry) return;
        isUndoingRef.current = true;
        if (entry.type === "add") {
          mods.util.enlivenObjects([entry.serialized]).then((objs: unknown[]) => {
            const obj = objs[0] as unknown as SaveableObj;
            if (!obj) return;
            fc.add(obj as Parameters<typeof fc.add>[0]);
            fc.requestRenderAll();
            saveObject(obj);
            if (entry.wasGif) { gifCountRef.current += 1; startGifLoop(); }
            setTimeout(() => {
              const newOid = obj.boardObjectId;
              if (newOid) undoStack.push({ type: "add", objectId: newOid, serialized: (obj as unknown as { toObject(): object }).toObject() });
            }, 0);
          }).catch(console.error);
        } else if (entry.type === "delete") {
          const obj = fc.getObjects().find(
            (o) => (o as unknown as { boardObjectId?: string }).boardObjectId === entry.objectId
          );
          if (obj) {
            const isGif = !!(obj as { giphyId?: string }).giphyId;
            undoStack.push({ type: "delete", serialized: (obj as unknown as { toObject(): object }).toObject(), wasGif: isGif });
            fc.remove(obj);
            fc.discardActiveObject();
            fc.requestRenderAll();
            if (entry.objectId) {
              fetch(`/api/board-objects?boardId=${BOARD_ID}&objectId=${encodeURIComponent(entry.objectId)}`, { method: "DELETE" })
                .then(() => broadcast?.({ type: "OBJECT_DELETED", objectId: entry.objectId }))
                .catch(console.error);
            }
            if (isGif) {
              gifCountRef.current = Math.max(0, gifCountRef.current - 1);
              if (gifCountRef.current === 0) stopGifLoop();
            }
          }
        } else if (entry.type === "modify") {
          const obj = fc.getObjects().find(
            (o) => (o as unknown as { boardObjectId?: string }).boardObjectId === entry.objectId
          );
          if (obj) {
            const beforeState = (obj as unknown as { toObject(): object }).toObject();
            undoStack.push({ type: "modify", objectId: entry.objectId, before: beforeState });
            obj.set(entry.after as Parameters<typeof obj.set>[0]);
            obj.setCoords();
            fc.requestRenderAll();
            saveObject(obj as unknown as SaveableObj);
          }
        }
        isUndoingRef.current = false;
        return;
      }

      // ── Select tool ('V') ─────────────────────────────────────────────
      if (e.key === "v" || e.key === "V") {
        if (isEditingText) return;
        e.preventDefault();
        setTool("select");
        return;
      }

      // ── Insert text at cursor ('T') ───────────────────────────────────
      if (e.key === "t" || e.key === "T") {
        if (isEditingText || !mods) return;
        e.preventDefault();
        const vpt = fc.viewportTransform as number[];
        const cx = (lastMouse.x - vpt[4]) / vpt[0];
        const cy = (lastMouse.y - vpt[5]) / vpt[3];
        const txt = new mods.Textbox("Type something", {
          left: cx,
          top: cy,
          originX: "center",
          originY: "center",
          width: 300,
          fontSize: Math.max(brushSizeRef.current * 2, 24),
          fill: colorRef.current,
          fontFamily: "sans-serif",
          editable: true,
        });
        fc.add(txt);
        fc.setActiveObject(txt);
        // Mark as pending so mouse:down doesn't spawn a second text object
        pendingTextRef.current = txt;
        fc.requestRenderAll();
        requestAnimationFrame(() => {
          txt.enterEditing();
          txt.selectAll();
          fc.requestRenderAll();
        });
        return;
      }

      // Never intercept while typing inside a text object
      if (!active || isEditingText) return;

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
        // Stamp zIndex on every object and save each one so order persists on reload
        const allObjs = fc.getObjects();
        allObjs.forEach((obj, i) => {
          (obj as unknown as SaveableObj).zIndex = i;
          if ((obj as unknown as { boardObjectId?: string }).boardObjectId) {
            saveObject(obj as unknown as SaveableObj);
          }
        });
        // Broadcast the new order to other clients
        broadcast?.({ type: "LAYER_REORDERED", order: allObjs.map(o => (o as unknown as { boardObjectId?: string }).boardObjectId ?? "") });
        return;
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;
      e.preventDefault();
      pendingMultiSave = null;
      // getActiveObjects() returns a flat array for both single and multi-select
      const members = fc.getActiveObjects()
        .filter((o) => !(o as unknown as { lockMovementX?: boolean }).lockMovementX)
        .slice() as unknown as SaveableObj[];
      fc.discardActiveObject();
      members.forEach((obj) => {
        const isGif = !!(obj as { giphyId?: string }).giphyId;
        pushUndo({ type: "delete", serialized: (obj as unknown as { toObject(): object }).toObject(), wasGif: isGif });
        fc.remove(obj as unknown as Parameters<typeof fc.remove>[0]);
        const oid = (obj as { boardObjectId?: string }).boardObjectId;
        if (oid) {
          fetch(`/api/board-objects?boardId=${BOARD_ID}&objectId=${encodeURIComponent(oid)}`, {
            method: "DELETE",
          })
            .then(() => broadcast?.({ type: "OBJECT_DELETED", objectId: oid }))
            .catch(console.error);
        }
        if ((obj as { giphyId?: string }).giphyId) {
          gifCountRef.current = Math.max(0, gifCountRef.current - 1);
          if (gifCountRef.current === 0) stopGifLoop();
        }
      });
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
      setVpt(fc.viewportTransform as number[]);
      lastTouchMid = { x: cx, y: cy };
    };
    const onTouchEnd = () => { lastTouchMid = null; };

    canvasEl.addEventListener("touchstart", onTouchStart, { passive: false });
    canvasEl.addEventListener("touchmove",  onTouchMove,  { passive: false });
    canvasEl.addEventListener("touchend",   onTouchEnd);

    // ── Fabric async init ─────────────────────────────────────────────────
    import("fabric").then(({ Canvas, PencilBrush, IText, Textbox, Point, Rect, Circle, Triangle, Path, Line, FabricImage, ActiveSelection, util, Gradient, Shadow, Pattern, FabricObject, Control }) => {
      modsRef.current = { Canvas, PencilBrush, IText, Textbox, Point, Rect, Circle, Triangle, Path, Line, FabricImage, ActiveSelection, util, Gradient, Shadow, Pattern };

      // Make selection borders and corner handles clearly visible
      FabricObject.ownDefaults.borderColor = "#4597f8";
      FabricObject.ownDefaults.cornerColor = "#4597f8";
      FabricObject.ownDefaults.cornerStrokeColor = "#4597f8";
      FabricObject.ownDefaults.cornerSize = 10;
      FabricObject.ownDefaults.transparentCorners = false;
      FabricObject.ownDefaults.borderOpacityWhenMoving = 1;

      // Replace the single mtr rotation handle with one rotate control per corner.
      // Steal the actionHandler and cursorStyleHandler from the existing mtr control
      // so we get identical rotation-with-snapping behaviour on all four corners.
      const _origCreateControls = FabricObject.createControls.bind(FabricObject);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (FabricObject as any).createControls = () => {
        const result = _origCreateControls();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mtr = result.controls.mtr as any;
        const rotateAction      = mtr?.actionHandler;
        const rotateCursorStyle = mtr?.cursorStyleHandler;
        // Remove the top-centre rotation handle entirely
        delete result.controls.mtr;

        // Corner positions on the Fabric bounding box (-0.5 … 0.5).
        // Offset of 12 + half sizeX of 10 = inner edge at 2px from corner;
        // resize handles (cornerSize 10) reach 5px → 3px overlap for seamless transition.
        const corners: Array<[string, number, number, number, number]> = [
          ["_rot_tl", -0.5, -0.5, -12, -12],
          ["_rot_tr",  0.5, -0.5,  12, -12],
          ["_rot_bl", -0.5,  0.5, -12,  12],
          ["_rot_br",  0.5,  0.5,  12,  12],
        ];
        for (const [key, x, y, ox, oy] of corners) {
          result.controls[key] = new Control({
            x, y,
            offsetX: ox,
            offsetY: oy,
            // Always rotate around the object center, not the opposite corner
            transformAnchorPoint: new Point(0.5, 0.5),
            actionHandler: rotateAction,
            cursorStyleHandler: rotateCursorStyle,
            cursorStyle: "alias",
            // Larger invisible hit area for easier grabbing
            sizeX: 20,
            sizeY: 20,
            // Don't render any visible handle
            render: () => { /* no-op */ },
          });
        }
        return result;
      };

      const fc = new Canvas(canvasEl, {
        width: window.innerWidth,
        height: window.innerHeight,
        isDrawingMode: false,
        selection: true,
        backgroundColor: BG_COLOR,
        selectionColor: "rgba(69,151,248,0.15)",
        selectionBorderColor: "#4597f8",
        selectionLineWidth: 2,
      });
      fabricRef.current = fc;
      fc.renderAll();

      // Stable callbacks: dispatch synthetic keyboard events so the existing
      // handleKeyDown closure handles the actual undo/redo logic.
      undoFnRef.current = () => window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", ctrlKey: true, metaKey: true, bubbles: true })
      );
      redoFnRef.current = () => window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Z", shiftKey: true, ctrlKey: true, metaKey: true, bubbles: true })
      );

      // Patch setCursor so native resize/grab cursors override the
      // CSS `cursor: none !important` set by .board-no-cursor.
      // Control-handle cursors (resize variants, grab) use setProperty
      // with 'important'; all other cursors stay hidden (custom SVG cursor takes over).
      {
        const upperEl = (fc as unknown as { upperCanvasEl: HTMLElement }).upperCanvasEl;
        fc.setCursor = (value: string) => {
          const isPencilOrBrush = toolRef.current === "pencil" || toolRef.current === "brush";
          const show = value.includes("resize") || value.startsWith("url(") || value === "grabbing" || value === "not-allowed" || value === "alias"
            || (value === "crosshair" && !isPencilOrBrush)
            || value === "text"
            || value === "cell";
          upperEl.style.setProperty("cursor", show ? value : "none", "important");
          setIsOverHandle?.(show);
        };
      }

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
          // Sort by persisted zIndex so layer order is restored correctly
          parsed.sort((a, b) => ((a.zIndex as number) ?? 0) - ((b.zIndex as number) ?? 0));
          parsed.forEach((o) => { if (o.type === "IText" || o.type === "i-text" || o.type === "Textbox" || o.type === "textbox") o.editable = false; });
          const enlivened = await util.enlivenObjects(parsed);

          // Separate GIF objects so we can re-decode them asynchronously
          const gifRestorePromises: Promise<void>[] = [];

          (enlivened as unknown[]).forEach((obj, i) => {
            const src = parsed[i];
            if (src.boardObjectId) (obj as Record<string, unknown>).boardObjectId = src.boardObjectId;
            if (src.zIndex !== undefined) (obj as Record<string, unknown>).zIndex = src.zIndex;

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
      fc.on("path:created", (e) => {
        if (isUndoingRef.current) return;
        e.path.set({
          opacity: opacityRef.current,
          // expand bbox by half stroke width so the stroke edge is never clipped
          padding: (e.path.strokeWidth ?? 0) / 2,
        });
        // Apply gradient stroke if one is active
        if (fillGradientRef.current) {
          e.path.set({ stroke: buildFabricGradient(fillGradientRef.current) });
        }
        // Auto-simplify with an aggressive 8 px tolerance (RDP, curve-preserving)
        const raw = (e.path as unknown as { path: PathCmd[] }).path;
        const simplified = autoSimplifyPath(raw, 8);
        (e.path as unknown as { path: PathCmd[] }).path = simplified;
        (e.path as unknown as { setCoords(): void }).setCoords();
        fc.requestRenderAll();
        saveObject(e.path);
        // Push after saveObject so boardObjectId is assigned
        setTimeout(() => {
          const oid = (e.path as unknown as { boardObjectId?: string }).boardObjectId;
          if (oid) pushUndo({ type: "add", objectId: oid, serialized: (e.path as unknown as { toObject(): object }).toObject() });
        }, 0);
      });

      fc.on("object:modified", (e) => {
        if (isPastingRef.current) return; // don't double-save during paste
        const target = e.target;
        if (!target) return;
        if (!isUndoingRef.current && beforeTransformRef.current) {
          const oid = (target as unknown as { boardObjectId?: string }).boardObjectId;
          if (oid) pushUndo({ type: "modify", objectId: oid, before: beforeTransformRef.current });
          beforeTransformRef.current = null;
        }
        // Fabric v6 uses the lowercase string "activeselection"
        if ((target as { type?: string }).type === "activeselection") {
          pendingMultiSave = (target as unknown as { getObjects(): SaveableObj[] }).getObjects().slice();
          return;
        }
        saveObject(target);
      });

      fc.on("before:transform", (e) => {
        const target = (e as unknown as { transform?: { target?: unknown } }).transform?.target;
        if (!target) return;
        const o = target as unknown as { toObject(): object };
        beforeTransformRef.current = o.toObject();
      });

      const handleSelectionChange = () => {
        setHasSelection(true);
        const obj = fc.getActiveObject();
        const isText = !!obj && ((obj as { type?: string }).type === "i-text" || (obj as { type?: string }).type === "textbox");
        const isGif  = !!obj && !!(obj as { giphyId?: string }).giphyId;
        const isPath  = !!obj && (obj as { type?: string }).type === "path" && !(obj as { giphyId?: string }).giphyId;
        // Any non-text, non-gif, non-path object is a shape (rect, circle, etc.)
        const isShape = !!obj && !isText && !isGif && !isPath;
        setSelectedIsText(isText);
        setSelectedIsGif(isGif);
        setSelectedIsPath(isPath);
        if (isText) setTextProps(extractTextProps(obj as IText));
        if (isPath) {
          const pathObj = obj as unknown as { stroke?: string; strokeWidth?: number; opacity?: number };
          if (pathObj.stroke) setColor(pathObj.stroke);
          if (pathObj.strokeWidth != null) setBrushSize(pathObj.strokeWidth);
          if (pathObj.opacity != null) setOpacity(pathObj.opacity);
        }
        if (isShape) {
          const shapeObj = obj as unknown as { fill?: string; stroke?: string; opacity?: number };
          if (shapeObj.fill && typeof shapeObj.fill === "string") setColor(shapeObj.fill);
          if (shapeObj.opacity != null) setOpacity(shapeObj.opacity);
          const s = shapeObj.stroke;
          setShapeStrokeColor(s && s !== "transparent" && s !== "" ? s : "#000000");
        }
        // Lock state for the floating lock button
        setSelectedIsLocked(!!(obj as unknown as Record<string, unknown>)?.lockMovementX);
      };

      fc.on("selection:created", handleSelectionChange);
      fc.on("selection:updated", handleSelectionChange);
      // When a text object enters editing mode Fabric fires selection:cleared,
      // which would hide the lock button.  Re-assert selection state here.
      fc.on("text:editing:entered", handleSelectionChange);
      fc.on("selection:cleared", () => {
        setHasSelection(false);
        setSelectedIsText(false);
        setSelectedIsGif(false);
        setSelectedIsPath(false);
        setSelectedIsLocked(false);
        if (!pendingMultiSave) return;
        const objs = pendingMultiSave;
        pendingMultiSave = null;
        objs.forEach((obj) => saveObject(obj));
      });

      // ── Track canvas empty state ─────────────────────────────────────────
      const updateCanvasEmpty = () => setCanvasEmpty?.(fc.getObjects().length === 0);
      fc.on("object:added",   updateCanvasEmpty);
      fc.on("object:removed", updateCanvasEmpty);

      fc.on("object:rotating", (e) => {
        if (!e.e.shiftKey || !e.target) return;
        e.target.set("angle", Math.round(e.target.angle! / 45) * 45);
      });

      // Lock-button position — handled by ObjectLockButton's own RAF loop.

      // ── Eraser ───────────────────────────────────────────────────────────
      const isEraserDownRef = { current: false };

      function eraseObject(obj: unknown) {
        const o = obj as unknown as SaveableObj & { giphyId?: string };
        // Don't erase locked objects
        if ((o as { lockMovementX?: boolean }).lockMovementX) return;
        pushUndo({ type: "delete", serialized: (o as unknown as { toObject(): object }).toObject(), wasGif: !!o.giphyId });
        fc.remove(obj as Parameters<typeof fc.remove>[0]);
        fc.requestRenderAll();
        const oid = (o as { boardObjectId?: string }).boardObjectId;
        if (oid) {
          fetch(`/api/board-objects?boardId=${BOARD_ID}&objectId=${encodeURIComponent(oid)}`, {
            method: "DELETE",
          })
            .then(() => broadcast?.({ type: "OBJECT_DELETED", objectId: oid }))
            .catch(console.error);
        }
        if (o.giphyId) {
          gifCountRef.current = Math.max(0, gifCountRef.current - 1);
          if (gifCountRef.current === 0) stopGifLoop();
        }
      }

      function eraseAtEvent(e: { e: Event }) {
        const pointer = fc.getScenePoint(e.e as MouseEvent);
        const objects = fc.getObjects();
        // Iterate top-most first so we erase the visually topmost object
        for (let i = objects.length - 1; i >= 0; i--) {
          const obj = objects[i] as unknown as { containsPoint: (p: unknown) => boolean };
          if (obj.containsPoint(pointer)) {
            eraseObject(objects[i]);
            break;
          }
        }
      }

      fc.on("mouse:move", (e) => {
        if (toolRef.current !== "eraser" || !isEraserDownRef.current) return;
        eraseAtEvent(e);
      });

      // ── Shape drag-to-draw ───────────────────────────────────────────────
      let isDrawingShape = false;
      let shapeStart = { x: 0, y: 0 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let shapePreview: any = null;
      let shapeNaturalW = 1;
      let shapeNaturalH = 1;

      // ── Line drag-to-draw ────────────────────────────────────────────────
      let isDrawingLine = false;
      let lineStart = { x: 0, y: 0 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let linePreview: any = null;

      const STAR_PATH  = "M 50 5 L 61 35 L 95 35 L 68 57 L 79 91 L 50 70 L 21 91 L 32 57 L 5 35 L 39 35 Z";
      const HEART_PATH = "M 50 85 C 10 60 -10 35 10 18 C 25 5 42 10 50 22 C 58 10 75 5 90 18 C 110 35 90 60 50 85 Z";

      // ── Build a Fabric Gradient from a TextGradient spec ─────────────────
      function buildFabricGradient(gradient: import("../types").TextGradient) {
        const mods = modsRef.current!;
        const { stops, angle } = gradient;
        const rad = (angle * Math.PI) / 180;
        const dx = Math.sin(rad);
        const dy = -Math.cos(rad);
        return new mods.Gradient({
          type: "linear",
          gradientUnits: "percentage",
          coords: { x1: 0.5 - dx * 0.5, y1: 0.5 - dy * 0.5, x2: 0.5 + dx * 0.5, y2: 0.5 + dy * 0.5 },
          colorStops: stops.map(s => ({ offset: s.offset, color: s.color })),
        });
      }

      function buildPreviewShape(type: ShapeType, left: number, top: number, w: number, h: number) {
        const mods = modsRef.current;
        if (!mods) return null;
        const common = {
          left, top,
          fill: colorRef.current,
          stroke: "#000000",
          strokeWidth: 2,
          paintFirst: "stroke" as const,
          strokeUniform: true,
          selectable: false,
          hasControls: false,
          hasBorders: false,
          evented: false,
          originX: "left" as const,
          originY: "top" as const,
          opacity: opacityRef.current,
        };
        switch (type) {
          case "rect":     return new mods.Rect({ ...common, width: Math.max(w, 1), height: Math.max(h, 1) });
          case "circle":   return new mods.Circle({ ...common, radius: Math.max(w / 2, 0.5) });
          case "triangle": return new mods.Triangle({ ...common, width: Math.max(w, 1), height: Math.max(h, 1) });
          case "star":     return new mods.Path(STAR_PATH, { ...common });
          case "heart":    return new mods.Path(HEART_PATH, { ...common });
        }
      }

      fc.on("mouse:move", (e) => {
        if (toolRef.current === "line") {
          // Enforce crosshair at the DOM level every frame so Fabric's own
          // _setCursorFromEvent (which runs before this callback) can't override it.
          fc.setCursor("crosshair");
          if (!isDrawingLine) return;
          const pointer = fc.getScenePoint(e.e as MouseEvent);
          if (!linePreview) {
            linePreview = new modsRef.current!.Line(
              [lineStart.x, lineStart.y, pointer.x, pointer.y],
              {
                stroke: colorRef.current,
                strokeWidth: brushSizeRef.current,
                strokeLineCap: "round",
                fill: "",
                selectable: false,
                hasControls: false,
                hasBorders: false,
                evented: false,
                opacity: opacityRef.current,
                padding: brushSizeRef.current / 2,
              },
            );
            fc.add(linePreview);
          } else {
            linePreview.set({ x2: pointer.x, y2: pointer.y });
            linePreview.setCoords();
          }
          fc.requestRenderAll();
          return;
        }
        if (toolRef.current !== "shape" || !isDrawingShape) return;
        const pointer = fc.getScenePoint(e.e as MouseEvent);
        const shiftKey = (e.e as MouseEvent).shiftKey;
        const dx = pointer.x - shapeStart.x;
        const dy = pointer.y - shapeStart.y;
        const rawW = Math.abs(dx);
        const rawH = Math.abs(dy);
        // Shift → constrain to square/circle
        const effW = shiftKey ? Math.min(rawW, rawH) : rawW;
        const effH = shiftKey ? Math.min(rawW, rawH) : rawH;
        const left = dx >= 0 ? shapeStart.x : shapeStart.x - effW;
        const top  = dy >= 0 ? shapeStart.y : shapeStart.y - effH;
        const st = shapeTypeRef.current;

        if (!shapePreview) {
          shapePreview = buildPreviewShape(st, left, top, effW || 1, effH || 1);
          if (shapePreview) {
            shapeNaturalW = shapePreview.width ?? 1;
            shapeNaturalH = shapePreview.height ?? 1;
            fc.add(shapePreview);
          }
        } else {
          shapePreview.set({ left, top });
          switch (st) {
            case "rect":
            case "triangle":
              shapePreview.set({ width: Math.max(effW, 1), height: Math.max(effH, 1) });
              break;
            case "circle":
              // Use radius + scaleY so the circle can become an ellipse freely
              shapePreview.set({
                radius: Math.max(effW / 2, 0.5),
                scaleX: 1,
                scaleY: Math.max(effH, 1) / Math.max(effW, 1),
              });
              break;
            case "star":
            case "heart":
              shapePreview.set({
                scaleX: Math.max(effW, 1) / shapeNaturalW,
                scaleY: Math.max(effH, 1) / shapeNaturalH,
              });
              break;
          }
          shapePreview.setCoords();
        }
        fc.requestRenderAll();
      });

      fc.on("mouse:up", () => {
        if (toolRef.current === "line" && isDrawingLine) {
          isDrawingLine = false;
          if (linePreview) {
            const dx = (linePreview.x2 ?? 0) - (linePreview.x1 ?? 0);
            const dy = (linePreview.y2 ?? 0) - (linePreview.y1 ?? 0);
            if (Math.sqrt(dx * dx + dy * dy) < 5) {
              fc.remove(linePreview);
            } else {
              linePreview.set({ selectable: true, hasControls: true, hasBorders: true, evented: true });
              // Apply gradient stroke if active
              if (fillGradientRef.current) {
                linePreview.set({ stroke: buildFabricGradient(fillGradientRef.current) });
              }
              linePreview.setCoords();
              fc.setActiveObject(linePreview);
              saveObject(linePreview as unknown as SaveableObj);
              setTimeout(() => {
                const oid = (linePreview as unknown as { boardObjectId?: string }).boardObjectId;
                if (oid) pushUndo({ type: "add", objectId: oid, serialized: (linePreview as unknown as { toObject(): object }).toObject() });
                linePreview = null;
              }, 0);
            }
            if (linePreview) { linePreview = null; }
          }
          fc.requestRenderAll();
          setTool("select");
          return;
        }
        if (toolRef.current === "shape" && isDrawingShape) {
          isDrawingShape = false;
          if (shapePreview) {
            const st = shapeTypeRef.current;
            const effW = st === "circle"
              ? ((shapePreview.radius ?? 0) * 2 * (shapePreview.scaleX ?? 1))
              : ((shapePreview.width  ?? 0) * (shapePreview.scaleX ?? 1));
            const effH = st === "circle"
              ? ((shapePreview.radius ?? 0) * 2 * (shapePreview.scaleY ?? 1))
              : ((shapePreview.height ?? 0) * (shapePreview.scaleY ?? 1));
            if (effW < 5 && effH < 5) {
              fc.remove(shapePreview);
            } else {
              shapePreview.set({ selectable: true, hasControls: true, hasBorders: true, evented: true });
              // Apply gradient fill if active
              if (fillGradientRef.current) {
                shapePreview.set({ fill: buildFabricGradient(fillGradientRef.current) });
              }
              shapePreview.setCoords();
              fc.setActiveObject(shapePreview);
              saveObject(shapePreview as unknown as SaveableObj);
            }
            shapePreview = null;
          }
          fc.requestRenderAll();
          setTool("select");
          return;
        }
        isEraserDownRef.current = false;
      });

      fc.on("mouse:down", (e) => {
        if (toolRef.current === "line") {
          fc.selection = false;
          const pointer = fc.getScenePoint(e.e as MouseEvent);
          isDrawingLine = true;
          lineStart = { x: pointer.x, y: pointer.y };
          linePreview = null;
          return;
        }
        if (toolRef.current === "shape") {
          const pointer = fc.getScenePoint(e.e as MouseEvent);
          isDrawingShape = true;
          shapeStart = { x: pointer.x, y: pointer.y };
          shapePreview = null;
          return;
        }
        if (toolRef.current === "eraser") {
          isEraserDownRef.current = true;
          eraseAtEvent(e);
          return;
        }

        if (toolRef.current === "text") {
          // If a text object is already pending/editing, don't spawn another.
          if (pendingTextRef.current !== null) return;

          const pointer = fc.getScenePoint(e.e);
          const txt = new modsRef.current!.Textbox("", {
            left: pointer.x,
            top: pointer.y,
            width: 300,
            fontSize: Math.max(brushSizeRef.current * 2, 48),
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
        const targetType = (target as { type?: string }).type;
        if (!target || (targetType !== "i-text" && targetType !== "textbox")) return;
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
        else if (txt.text?.trim()) {
          saveObject(txt);
          if (isNew) {
            setTimeout(() => {
              const oid = (txt as unknown as { boardObjectId?: string }).boardObjectId;
              if (oid) pushUndo({ type: "add", objectId: oid, serialized: (txt as unknown as { toObject(): object }).toObject() });
            }, 0);
          }
        }
        setTool("select");
      });
    });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", trackMouse);
      window.removeEventListener("keydown", handleKeyDown);
      canvasEl.removeEventListener("touchstart", onTouchStart);
      canvasEl.removeEventListener("touchmove",  onTouchMove);
      canvasEl.removeEventListener("touchend",   onTouchEnd);
      stopGifLoop();
      fabricRef.current?.dispose();
      fabricRef.current = null;
      modsRef.current   = null;
    };
  }, [canvasElRef, fabricRef, colorRef, brushSizeRef, opacityRef, toolRef, saveObject, startGifLoop, stopGifLoop, gifCountRef, setTool, setZoom, setVpt, setHasSelection, setSelectedIsText, setSelectedIsGif, setSelectedIsPath, setSelectedIsLocked, setShapeStrokeColor, setColor, setBrushSize, setOpacity, setTextProps, setIsSyncing, broadcast, shapeTypeRef, fillGradientRef, setIsOverHandle]);

  return { modsRef, undoFnRef, redoFnRef };
}
