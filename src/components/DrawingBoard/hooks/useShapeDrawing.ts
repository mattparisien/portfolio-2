import { useEffect, useRef } from "react";
import type { Canvas } from "fabric";
import type { FabricMods, Tool, ShapeType, TextGradient } from "../types";
import { buildFabricGradient, STAR_PATH, HEART_PATH } from "../canvasUtils";
import type { SaveableObj } from "./useBoardSync";

interface UseShapeDrawingOptions {
  fabricRef:           React.MutableRefObject<Canvas | null>;
  modsRef:             React.MutableRefObject<FabricMods | null>;
  isReady:             boolean;
  toolRef:             React.MutableRefObject<Tool>;
  colorRef:            React.MutableRefObject<string>;
  opacityRef:          React.MutableRefObject<number>;
  shapeTypeRef:        React.MutableRefObject<ShapeType>;
  shapeStrokeColorRef: React.MutableRefObject<string>;
  fillGradientRef:     React.MutableRefObject<TextGradient | null>;
  saveObject:          (obj: SaveableObj) => void;
  setTool:             (t: Tool) => void;
  pushUndo:            (entry: { type: "add"; objectId: string; serialized: object }) => void;
}

/**
 * Handles drag-to-draw for the shape tool (rect / circle / triangle / star / heart).
 * Registers mouse:down, mouse:move, mouse:up on the Fabric canvas.
 */
export function useShapeDrawing({
  fabricRef,
  modsRef,
  isReady,
  toolRef,
  colorRef,
  opacityRef,
  shapeTypeRef,
  shapeStrokeColorRef,
  fillGradientRef,
  saveObject,
  setTool,
  pushUndo,
}: UseShapeDrawingOptions): void {
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
    let start      = { x: 0, y: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let preview: any = null;
    let naturalW   = 1;
    let naturalH   = 1;

    function buildPreview(type: ShapeType, left: number, top: number, w: number, h: number) {
      const mods = modsRef.current;
      if (!mods) return null;
      const stroke = shapeStrokeColorRef.current;
      const common = {
        left, top,
        fill:         colorRef.current,
        stroke,
        strokeWidth:  stroke === "transparent" ? 0 : 2,
        paintFirst:   "stroke" as const,
        strokeUniform: true,
        selectable:   false,
        hasControls:  false,
        hasBorders:   false,
        evented:      false,
        originX:      "left"  as const,
        originY:      "top"   as const,
        opacity:      opacityRef.current,
      };
      switch (type) {
        case "rect":     return new mods.Rect({ ...common, width: Math.max(w, 1), height: Math.max(h, 1) });
        case "circle":   return new mods.Circle({ ...common, radius: Math.max(w / 2, 0.5) });
        case "triangle": return new mods.Triangle({ ...common, width: Math.max(w, 1), height: Math.max(h, 1) });
        case "star":     return new mods.Path(STAR_PATH,  { ...common });
        case "heart":    return new mods.Path(HEART_PATH, { ...common });
        default:         return null;
      }
    }

    const onMouseDown = (e: { e: Event }) => {
      if (toolRef.current !== "shape") return;
      const pointer = fc.getScenePoint(e.e as MouseEvent);
      isDrawing = true;
      start     = { x: pointer.x, y: pointer.y };
      preview   = null;
    };

    const onMouseMove = (e: { e: Event }) => {
      if (toolRef.current !== "shape" || !isDrawing) return;
      const pointer  = fc.getScenePoint(e.e as MouseEvent);
      const shiftKey = (e.e as MouseEvent).shiftKey;
      const dx       = pointer.x - start.x;
      const dy       = pointer.y - start.y;
      const rawW     = Math.abs(dx);
      const rawH     = Math.abs(dy);
      const effW     = shiftKey ? Math.min(rawW, rawH) : rawW;
      const effH     = shiftKey ? Math.min(rawW, rawH) : rawH;
      const left     = dx >= 0 ? start.x : start.x - effW;
      const top      = dy >= 0 ? start.y : start.y - effH;
      const st       = shapeTypeRef.current;

      if (!preview) {
        preview = buildPreview(st, left, top, effW || 1, effH || 1);
        if (preview) {
          naturalW = preview.width  ?? 1;
          naturalH = preview.height ?? 1;
          fc.add(preview);
        }
      } else {
        preview.set({ left, top });
        switch (st) {
          case "rect":
          case "triangle":
            preview.set({ width: Math.max(effW, 1), height: Math.max(effH, 1) });
            break;
          case "circle":
            preview.set({ radius: Math.max(effW / 2, 0.5), scaleX: 1, scaleY: Math.max(effH, 1) / Math.max(effW, 1) });
            break;
          case "star":
          case "heart":
            preview.set({ scaleX: Math.max(effW, 1) / naturalW, scaleY: Math.max(effH, 1) / naturalH });
            break;
        }
        preview.setCoords();
      }
      fc.requestRenderAll();
    };

    const onMouseUp = () => {
      if (toolRef.current !== "shape" || !isDrawing) return;
      isDrawing = false;
      if (preview) {
        const st   = shapeTypeRef.current;
        const effW = st === "circle"
          ? (preview.radius ?? 0) * 2 * (preview.scaleX ?? 1)
          : (preview.width  ?? 0) * (preview.scaleX ?? 1);
        const effH = st === "circle"
          ? (preview.radius ?? 0) * 2 * (preview.scaleY ?? 1)
          : (preview.height ?? 0) * (preview.scaleY ?? 1);

        if (effW < 5 && effH < 5) {
          fc.remove(preview);
        } else {
          preview.set({ selectable: true, hasControls: true, hasBorders: true, evented: true });
          const mods = modsRef.current;
          if (fillGradientRef.current && mods) {
            preview.set({ fill: buildFabricGradient(fillGradientRef.current, mods) });
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
