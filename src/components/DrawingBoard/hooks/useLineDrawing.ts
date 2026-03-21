import { useEffect, useRef } from "react";
import type { Canvas } from "fabric";
import type { FabricMods, Tool, TextGradient } from "../types";
import { buildFabricGradient } from "../canvasUtils";
import type { SaveableObj } from "./useBoardSync";

interface UseLineDrawingOptions {
  fabricRef:       React.MutableRefObject<Canvas | null>;
  modsRef:         React.MutableRefObject<FabricMods | null>;
  isReady:         boolean;
  toolRef:         React.MutableRefObject<Tool>;
  colorRef:        React.MutableRefObject<string>;
  brushSizeRef:    React.MutableRefObject<number>;
  opacityRef:      React.MutableRefObject<number>;
  fillGradientRef: React.MutableRefObject<TextGradient | null>;
  saveObject:      (obj: SaveableObj) => void;
  setTool:         (t: Tool) => void;
  pushUndo:        (entry: { type: "add"; objectId: string; serialized: object }) => void;
}

/**
 * Handles drag-to-draw for the line tool.
 * Registers mouse:down, mouse:move, mouse:up on the Fabric canvas.
 */
export function useLineDrawing({
  fabricRef,
  modsRef,
  isReady,
  toolRef,
  colorRef,
  brushSizeRef,
  opacityRef,
  fillGradientRef,
  saveObject,
  setTool,
  pushUndo,
}: UseLineDrawingOptions): void {
  const saveRef     = useRef(saveObject);
  const setToolRef  = useRef(setTool);
  const pushUndoRef = useRef(pushUndo);
  saveRef.current     = saveObject;
  setToolRef.current  = setTool;
  pushUndoRef.current = pushUndo;

  useEffect(() => {
    if (!isReady) return;
    const fc = fabricRef.current;
    if (!fc) return;

    let isDrawing  = false;
    let lineStart  = { x: 0, y: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let preview: any = null;

    const onMouseDown = (e: { e: Event }) => {
      if (toolRef.current !== "line") return;
      fc.selection = false;
      const pointer = fc.getScenePoint(e.e as MouseEvent);
      isDrawing  = true;
      lineStart  = { x: pointer.x, y: pointer.y };
      preview    = null;
    };

    const onMouseMove = (e: { e: Event }) => {
      if (toolRef.current !== "line") {
        // Keep crosshair even when not drawing
        fc.setCursor("crosshair");
        return;
      }
      // Force crosshair so Fabric's internal cursor logic doesn't override it.
      fc.setCursor("crosshair");
      if (!isDrawing) return;

      const mods = modsRef.current;
      if (!mods) return;
      const pointer = fc.getScenePoint(e.e as MouseEvent);

      if (!preview) {
        preview = new mods.Line(
          [lineStart.x, lineStart.y, pointer.x, pointer.y],
          {
            stroke:        colorRef.current,
            strokeWidth:   brushSizeRef.current,
            strokeLineCap: "round",
            selectable:    false,
            hasControls:   false,
            hasBorders:    false,
            evented:       false,
            opacity:       opacityRef.current,
            padding:       brushSizeRef.current / 2,
          },
        );
        fc.add(preview);
      } else {
        preview.set({ x2: pointer.x, y2: pointer.y });
        preview.setCoords();
      }
      fc.requestRenderAll();
    };

    const onMouseUp = () => {
      if (toolRef.current !== "line" || !isDrawing) return;
      isDrawing = false;

      if (preview) {
        const dx = (preview.x2 ?? 0) - (preview.x1 ?? 0);
        const dy = (preview.y2 ?? 0) - (preview.y1 ?? 0);
        if (Math.sqrt(dx * dx + dy * dy) < 5) {
          fc.remove(preview);
        } else {
          preview.set({ selectable: true, hasControls: true, hasBorders: true, evented: true });
          const mods = modsRef.current;
          if (fillGradientRef.current && mods) {
            preview.set({ stroke: buildFabricGradient(fillGradientRef.current, mods) });
          }
          preview.setCoords();
          fc.setActiveObject(preview);
          saveRef.current(preview as unknown as SaveableObj);
          const captured = preview;
          setTimeout(() => {
            const oid = (captured as unknown as { boardObjectId?: string }).boardObjectId;
            if (oid) pushUndoRef.current({ type: "add", objectId: oid, serialized: (captured as unknown as { toObject(): object }).toObject() });
          }, 0);
        }
        preview = null;
      }

      fc.requestRenderAll();
      fc.selection = true;
      setToolRef.current("select");
    };

    fc.on("mouse:down", onMouseDown);
    fc.on("mouse:move", onMouseMove);
    fc.on("mouse:up",   onMouseUp);

    return () => {
      fc.off("mouse:down", onMouseDown);
      fc.off("mouse:move", onMouseMove);
      fc.off("mouse:up",   onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);
}
