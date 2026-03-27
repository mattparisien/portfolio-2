import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import type { Canvas, IText, Textbox } from "fabric";
import type { Tool, FabricMods, TextProps, ShapeType, TextGradient } from "../types";
import type { SaveableObj } from "./useBoardSync";
import { autoSimplifyPath, buildFabricGradient, type PathCmd } from "../canvasUtils";
import type { RoomEvent } from "@/liveblocks.config";

import { useFabricInit } from "./useFabricInit";
import { useCanvasLoad } from "./useCanvasLoad";
import { useUndoRedo } from "./useUndoRedo";
import { useClipboard } from "./useClipboard";
import { useSelectionState } from "./useSelectionState";
import { useShapeDrawing } from "./useShapeDrawing";
import { useLineDrawing } from "./useLineDrawing";
import { useEraserTool } from "./useEraserTool";
import { useTouchHandling } from "./useTouchHandling";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

interface UseFabricCanvasOptions {
  canvasElRef:  React.RefObject<HTMLCanvasElement | null>;
  fabricRef:    React.MutableRefObject<Canvas | null>;
  colorRef:     React.MutableRefObject<string>;
  brushSizeRef: React.MutableRefObject<number>;
  toolRef:      React.MutableRefObject<Tool>;
  saveObject:   (obj: SaveableObj) => void;
  startGifLoop: () => void;
  stopGifLoop:  () => void;
  gifCountRef:  React.MutableRefObject<number>;
  videoCountRef?: React.MutableRefObject<number>;
  audioCountRef?: React.MutableRefObject<number>;
  setTool:      (t: Tool) => void;
  setZoom:      (z: number) => void;
  setVpt:       (vpt: number[]) => void;
  setHasSelection:      (v: boolean) => void;
  setSelectedIsText:    (v: boolean) => void;
  setSelectedIsGif:     (v: boolean) => void;
  setSelectedIsImage?:  (v: boolean) => void;
  setImageBlendMode?:   (v: string) => void;
  setSelectedIsPath:    (v: boolean) => void;
  setSelectedIsLine:    (v: boolean) => void;
  setSelectedIsLocked:  (v: boolean) => void;
  setShapeStrokeColor:  (c: string) => void;
  setColor:     (c: string) => void;
  setBrushSize: (s: number) => void;
  setOpacity:   (v: number) => void;
  opacityRef:   React.MutableRefObject<number>;
  setTextProps: Dispatch<SetStateAction<TextProps>>;
  setIsSyncing: (v: boolean) => void;
  broadcast?:   (event: RoomEvent) => void;
  shapeTypeRef:        React.MutableRefObject<ShapeType>;
  fillGradientRef:     React.MutableRefObject<TextGradient | null>;
  shapeStrokeColorRef: React.MutableRefObject<string>;
  setIsOverHandle?:    (v: boolean) => void;
  setCanvasEmpty?:     (v: boolean) => void;
  initialObjects: { fabricJSON: string }[];
}

export function useFabricCanvas(opts: UseFabricCanvasOptions) {
  const {
    canvasElRef, fabricRef, colorRef, brushSizeRef, toolRef,
    saveObject, startGifLoop, stopGifLoop, gifCountRef, videoCountRef, audioCountRef,
    setTool, setZoom, setVpt,
    setHasSelection, setSelectedIsText, setSelectedIsGif,
    setSelectedIsImage, setImageBlendMode,
    setSelectedIsPath, setSelectedIsLine, setSelectedIsLocked,
    setShapeStrokeColor, setColor, setBrushSize, setOpacity, opacityRef,
    setTextProps, setIsSyncing, broadcast,
    shapeTypeRef, fillGradientRef, shapeStrokeColorRef,
    setIsOverHandle, setCanvasEmpty, initialObjects,
  } = opts;

  const router = useRouter();
  const modsRef = useRef<FabricMods | null>(null);

  const undoFnRef   = useRef(() => window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "z", ctrlKey: true, metaKey: true, bubbles: true })
  ));
  const redoFnRef   = useRef(() => window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Z", shiftKey: true, ctrlKey: true, metaKey: true, bubbles: true })
  ));
  const deleteFnRef = useRef(() => window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Delete", bubbles: true })
  ));

  const pendingTextRef      = useRef<IText | Textbox | null>(null);
  const pendingMultiSaveRef = useRef<SaveableObj[] | null>(null);
  const beforeTransformRef  = useRef<object | null>(null);

  // ── Sub-hooks ────────────────────────────────────────────────────────────

  const isReady = useFabricInit({
    canvasElRef, fabricRef, modsRef,
    colorRef, brushSizeRef, toolRef,
    setZoom, setVpt, setIsOverHandle,
  });

  const { pushUndo, executeUndo, executeRedo, isUndoingRef } = useUndoRedo({
    fabricRef, modsRef, saveObject, broadcast,
    startGifLoop, stopGifLoop, gifCountRef,
  });

  const { copy, paste, isPastingRef } = useClipboard({
    fabricRef, modsRef, saveObject, startGifLoop, gifCountRef,
  });

  useCanvasLoad({
    fabricRef, modsRef, isReady, initialObjects,
    setIsSyncing, startGifLoop, gifCountRef, videoCountRef, audioCountRef,
  });

  useSelectionState({
    fabricRef, isReady, pendingMultiSaveRef, saveObject,
    setHasSelection, setSelectedIsText, setSelectedIsGif,
    setSelectedIsImage, setImageBlendMode,
    setSelectedIsPath, setSelectedIsLine, setSelectedIsLocked,
    setShapeStrokeColor, setColor, setBrushSize, setOpacity, setTextProps,
  });

  useShapeDrawing({
    fabricRef, modsRef, isReady,
    toolRef, colorRef, opacityRef,
    shapeTypeRef, shapeStrokeColorRef, fillGradientRef,
    saveObject, setTool, pushUndo,
  });

  useLineDrawing({
    fabricRef, modsRef, isReady,
    toolRef, colorRef, brushSizeRef, opacityRef, fillGradientRef,
    saveObject, setTool, pushUndo,
  });

  useEraserTool({
    fabricRef, isReady,
    toolRef, gifCountRef, videoCountRef,
    broadcast, pushUndo, stopGifLoop,
  });

  useTouchHandling({ fabricRef, isReady, setZoom, setVpt });

  useKeyboardShortcuts({
    fabricRef, modsRef, toolRef, colorRef, brushSizeRef,
    pendingTextRef, pendingMultiSaveRef,
    executeUndo, executeRedo, copy, paste,
    pushUndo, saveObject, broadcast,
    setTool, gifCountRef, videoCountRef, stopGifLoop,
  });

  useEffect(() => () => stopGifLoop(), [stopGifLoop]);

  const saveRef      = useRef(saveObject);
  const broadcastRef = useRef(broadcast);
  saveRef.current      = saveObject;
  broadcastRef.current = broadcast;

  useEffect(() => {
    if (!isReady) return;
    const fc   = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    // Sync initial empty state now that the canvas is ready
    setCanvasEmpty?.(fc.getObjects().length === 0);

    const onPathCreated = (e: { path: Parameters<typeof fc.add>[0] }) => {
      if (isUndoingRef.current) return;
      const path = e.path as unknown as {
        opacity: number; strokeWidth?: number; padding: number; stroke: unknown;
        path: PathCmd[]; set(p: object): void; setCoords(): void;
        toObject(): object; boardObjectId?: string;
      };
      path.set({ opacity: opacityRef.current, padding: (path.strokeWidth ?? 0) / 2 });
      if (fillGradientRef.current) {
        path.set({ stroke: buildFabricGradient(fillGradientRef.current, mods) });
      }
      path.path = autoSimplifyPath(path.path, 8);
      path.setCoords();
      fc.requestRenderAll();
      saveRef.current(e.path as unknown as SaveableObj);
      setTimeout(() => {
        const oid = path.boardObjectId;
        if (oid) pushUndo({ type: "add", objectId: oid, serialized: path.toObject() });
      }, 0);
    };

    const onObjectModified = (e: { target?: Parameters<typeof fc.add>[0] }) => {
      if (isPastingRef.current) return;
      const target = e.target;
      if (!target) return;
      if (!isUndoingRef.current && beforeTransformRef.current) {
        const oid = (target as unknown as { boardObjectId?: string }).boardObjectId;
        if (oid) pushUndo({ type: "modify", objectId: oid, before: beforeTransformRef.current });
        beforeTransformRef.current = null;
      }
      if ((target as { type?: string }).type === "activeselection") {
        pendingMultiSaveRef.current =
          (target as unknown as { getObjects(): SaveableObj[] }).getObjects().slice();
        return;
      }
      saveRef.current(target as unknown as SaveableObj);
    };

    const onBeforeTransform = (e: unknown) => {
      const target = (e as { transform?: { target?: unknown } }).transform?.target;
      if (!target) return;
      beforeTransformRef.current = (target as unknown as { toObject(): object }).toObject();
    };

    const onObjectRotating = (e: {
      e: Event;
      target?: { angle?: number; set(k: string, v: number): void };
    }) => {
      if (!(e.e as MouseEvent).shiftKey || !e.target) return;
      e.target.set("angle", Math.round((e.target.angle ?? 0) / 45) * 45);
    };

    const updateCanvasEmpty = () => setCanvasEmpty?.(fc.getObjects().length === 0);

    const onMouseDown = (e: { e: Event }) => {
      if (toolRef.current !== "text") return;
      if (pendingTextRef.current !== null) return;
      const pointer = fc.getScenePoint(e.e as PointerEvent);
      const txt = new mods.IText("", {
        left: pointer.x, top: pointer.y,
        fontSize:   Math.max(brushSizeRef.current * 2, 48),
        fill:       colorRef.current,
        fontFamily: "sans-serif",
        editable:   true,
      });
      fc.add(txt);
      fc.setActiveObject(txt);
      txt.enterEditing();
      pendingTextRef.current = txt;
    };

    const onMouseMove = (e: { target?: unknown; e?: Event }) => {
      const target = e.target;
      const type = (target as { type?: string })?.type;
      if (!target || (type !== "i-text" && type !== "textbox")) {
        fc.setCursor("default");
        return;
      }
      // Only show pointer when the object is NOT the active (selected) object
      const active = fc.getActiveObject();
      if (active === target) return;

      const txt = target as unknown as IText & {
        hyperlinks?: Array<{ start: number; end: number; url: string }>;
        getSelectionStartFromPointer(ev: Event): number;
      };
      const hyperlinks = txt.hyperlinks;
      if (hyperlinks && hyperlinks.length > 0 && e.e) {
        try {
          const charIdx = txt.getSelectionStartFromPointer(e.e);
          const onLink = hyperlinks.some(h => charIdx >= h.start && charIdx < h.end);
          fc.setCursor(onLink ? "pointer" : "default");
        } catch {
          fc.setCursor("default");
        }
      } else {
        fc.setCursor("default");
      }
    };

    const onMouseDblClick = (e: { target?: unknown; e?: Event }) => {
      const target = e.target;
      const type   = (target as { type?: string })?.type;
      if (!target || (type !== "i-text" && type !== "textbox")) return;
      const txt = target as unknown as IText & {
        hyperlinks?: Array<{ start: number; end: number; url: string }>;
        getSelectionStartFromPointer(ev: Event): number;
      };

      // Navigate if the double-click lands on a hyperlinked character
      const hyperlinks = txt.hyperlinks;
      if (hyperlinks && hyperlinks.length > 0 && e.e) {
        try {
          const charIdx = txt.getSelectionStartFromPointer(e.e);
          const link = hyperlinks.find(h => charIdx >= h.start && charIdx < h.end);
          if (link) {
            const isRelative = /^\/|^#/.test(link.url) || !/^[a-z][a-z0-9+\-.]*:/i.test(link.url);
            if (isRelative) {
              router.push(link.url);
            } else {
              window.open(link.url, "_blank", "noopener,noreferrer");
            }
            return; // don't enter editing mode
          }
        } catch {
          // fall through to normal editing if method unavailable
        }
      }

      txt.set({ editable: true });
      fc.setActiveObject(txt);
      txt.enterEditing();
      pendingTextRef.current = txt;
    };

    const onTextEditingExited = (e: { target: IText | Textbox }) => {
      const txt   = e.target as IText;
      const isNew = txt === pendingTextRef.current;
      pendingTextRef.current = null;
      if (isNew && !txt.text?.trim()) {
        fc.remove(txt as unknown as Parameters<typeof fc.remove>[0]);
        fc.requestRenderAll();
      } else if (txt.text?.trim()) {
        saveRef.current(txt as unknown as SaveableObj);
        if (isNew) {
          setTimeout(() => {
            const oid = (txt as unknown as { boardObjectId?: string }).boardObjectId;
            if (oid) pushUndo({ type: "add", objectId: oid, serialized: (txt as unknown as { toObject(): object }).toObject() });
          }, 0);
        }
      }
      setTool("select");
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fc.on("path:created",        onPathCreated       as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fc.on("object:modified",     onObjectModified    as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fc.on("before:transform",    onBeforeTransform   as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fc.on("object:rotating",     onObjectRotating    as any);
    fc.on("object:added",        updateCanvasEmpty);
    fc.on("object:removed",      updateCanvasEmpty);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fc.on("mouse:down",          onMouseDown         as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fc.on("mouse:move",          onMouseMove         as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fc.on("mouse:dblclick",      onMouseDblClick     as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fc.on("text:editing:exited", onTextEditingExited as any);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fc.off("path:created",        onPathCreated       as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fc.off("object:modified",     onObjectModified    as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fc.off("before:transform",    onBeforeTransform   as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fc.off("object:rotating",     onObjectRotating    as any);
      fc.off("object:added",        updateCanvasEmpty);
      fc.off("object:removed",      updateCanvasEmpty);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fc.off("mouse:down",          onMouseDown         as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fc.off("mouse:move",          onMouseMove         as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fc.off("mouse:dblclick",      onMouseDblClick     as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fc.off("text:editing:exited", onTextEditingExited as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  return { modsRef, undoFnRef, redoFnRef, deleteFnRef, isReady };
}
