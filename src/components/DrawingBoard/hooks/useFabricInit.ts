import { useRef, useEffect, useState } from "react";
import type { Canvas } from "fabric";
import type { FabricMods, Tool } from "../types";
import { getCanvasBgColor } from "../canvasUtils";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;

interface UseFabricInitOptions {
  canvasElRef: React.RefObject<HTMLCanvasElement | null>;
  fabricRef: React.MutableRefObject<Canvas | null>;
  modsRef: React.MutableRefObject<FabricMods | null>;
  colorRef: React.MutableRefObject<string>;
  brushSizeRef: React.MutableRefObject<number>;
  toolRef: React.MutableRefObject<Tool>;
  setZoom: (z: number) => void;
  setVpt: (vpt: number[]) => void;
  setIsOverHandle?: (v: boolean) => void;
}

/**
 * Handles canvas lifecycle: async Fabric import, Canvas creation, global
 * FabricObject defaults, corner rotation controls, brush init, cursor
 * patching, wheel-zoom/pan, and window resize.
 *
 * Returns `isReady` (true once the Canvas instance exists). All other hooks
 * gate their effects on this flag.
 */
export function useFabricInit({
  canvasElRef,
  fabricRef,
  modsRef,
  colorRef,
  brushSizeRef,
  toolRef,
  setZoom,
  setVpt,
  setIsOverHandle,
}: UseFabricInitOptions): boolean {
  const [isReady, setIsReady] = useState(false);
  const genRef = useRef(0);
  const disposePromiseRef = useRef<Promise<unknown>>(Promise.resolve());

  // Keep latest callbacks in refs so the wheel handler always uses current setZoom/setVpt
  // without needing to re-register the event listener.
  const setZoomRef    = useRef(setZoom);
  const setVptRef     = useRef(setVpt);
  const setOverRef    = useRef(setIsOverHandle);
  setZoomRef.current  = setZoom;
  setVptRef.current   = setVpt;
  setOverRef.current  = setIsOverHandle;

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    if (!canvasEl) return;

    const gen = ++genRef.current;

    const handleWheel = (e: WheelEvent) => {
      const fc   = fabricRef.current;
      const mods = modsRef.current;
      if (!fc || !mods) return;

      // Always allow scrolling inside any explicitly marked scroll container (e.g. popovers/dropdowns)
      let t: HTMLElement | null = e.target as HTMLElement | null;
      while (t && t !== document.documentElement) {
        if (t.dataset?.scrollContainer) return;
        t = t.parentElement;
      }

      // Allow popovers / scroll containers inside the UI overlay to scroll normally.
      const canvasWrapper = canvasElRef.current?.parentElement;
      if (canvasWrapper && !canvasWrapper.contains(e.target as Node)) {
        let el: HTMLElement | null = e.target as HTMLElement | null;
        while (el && el !== document.documentElement) {
          const { overflowY, overflow } = window.getComputedStyle(el);
          if (["auto", "scroll"].includes(overflowY) || ["auto", "scroll"].includes(overflow)) {
            if (el.scrollHeight > el.clientHeight) return;
          }
          el = el.parentElement;
        }
      }
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fc.getZoom() * (1 - e.deltaY * 0.003)));
        fc.zoomToPoint(new mods.Point(e.clientX, e.clientY), z);
        setZoomRef.current(z);
        setVptRef.current(fc.viewportTransform as number[]);
      } else {
        fc.relativePan(new mods.Point(-e.deltaX * 2, -e.deltaY * 2));
        setVptRef.current(fc.viewportTransform as number[]);
      }
    };

    const handleResize = () => {
      fabricRef.current?.setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("wheel",   handleWheel,  { passive: false });
    window.addEventListener("resize",  handleResize);

    import("fabric").then(async ({
      Canvas, PencilBrush, IText, Textbox, Point, Rect, Circle, Triangle,
      Path, Line, FabricImage, ActiveSelection, util, Gradient, Shadow, Pattern,
      FabricObject, Control,
    }) => {
      await disposePromiseRef.current;
      if (genRef.current !== gen) return;

      modsRef.current = {
        Canvas, PencilBrush, IText, Textbox, Point, Rect, Circle, Triangle,
        Path, Line, FabricImage, ActiveSelection, util, Gradient, Shadow, Pattern,
      };

      // ── Global FabricObject defaults ──────────────────────────────────
      FabricObject.ownDefaults.borderColor           = "#4597f8";
      FabricObject.ownDefaults.cornerColor           = "#4597f8";
      FabricObject.ownDefaults.cornerStrokeColor     = "#4597f8";
      FabricObject.ownDefaults.cornerSize            = 10;
      FabricObject.ownDefaults.transparentCorners    = false;
      FabricObject.ownDefaults.borderOpacityWhenMoving = 1;

      // ── Replace single top-centre mtr handle with four corner rotate handles ──
      const _origCreateControls = FabricObject.createControls.bind(FabricObject);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (FabricObject as any).createControls = () => {
        const result = _origCreateControls();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mtr             = result.controls.mtr as any;
        const rotateAction    = mtr?.actionHandler;
        const rotateCursor    = mtr?.cursorStyleHandler;
        delete result.controls.mtr;

        const corners: Array<[string, number, number, number, number]> = [
          ["_rot_tl", -0.5, -0.5, -12, -12],
          ["_rot_tr",  0.5, -0.5,  12, -12],
          ["_rot_bl", -0.5,  0.5, -12,  12],
          ["_rot_br",  0.5,  0.5,  12,  12],
        ];
        for (const [key, x, y, ox, oy] of corners) {
          result.controls[key] = new Control({
            x, y, offsetX: ox, offsetY: oy,
            transformAnchorPoint: new Point(0.5, 0.5),
            actionHandler:       rotateAction,
            cursorStyleHandler:  rotateCursor,
            cursorStyle:         "alias",
            sizeX: 20, sizeY: 20,
            render: () => { /* invisible hit area */ },
          });
        }
        return result;
      };

      // ── Canvas ────────────────────────────────────────────────────────
      const fc = new Canvas(canvasEl, {
        width:                window.innerWidth,
        height:               window.innerHeight,
        isDrawingMode:        false,
        selection:            true,
        backgroundColor:      getCanvasBgColor(),
        selectionColor:       "rgba(69,151,248,0.15)",
        selectionBorderColor: "#4597f8",
        selectionLineWidth:   2,
      });
      fabricRef.current = fc;
      fc.renderAll();

      // ── Cursor patching ───────────────────────────────────────────────
      // Hide the native cursor globally (CSS cursor:none on .board-no-cursor)
      // but restore it for resize/rotation handles so users can still grab them.
      const upperEl = (fc as unknown as { upperCanvasEl: HTMLElement }).upperCanvasEl;
      fc.setCursor = (value: string) => {
        const isPencil = toolRef.current === "pencil";
        const show =
          value.includes("resize") ||
          value.startsWith("url(")  ||
          value === "grabbing"      ||
          value === "not-allowed"   ||
          value === "alias"         ||
          value === "pointer"       ||
          (value === "crosshair" && !isPencil) ||
          value === "text";
        upperEl.style.setProperty("cursor", show ? value : "none", "important");
        setOverRef.current?.(show);
      };

      // ── Pencil brush ──────────────────────────────────────────────────
      const brush  = new PencilBrush(fc);
      brush.color  = colorRef.current;
      brush.width  = brushSizeRef.current;
      fc.freeDrawingBrush = brush;

      setIsReady(true);
    });

    return () => {
      genRef.current++;
      window.removeEventListener("wheel",  handleWheel);
      window.removeEventListener("resize", handleResize);
      setIsReady(false);
      disposePromiseRef.current = fabricRef.current?.dispose() ?? Promise.resolve();
      fabricRef.current = null;
      modsRef.current   = null;
    };
    // Canvas element ref is stable; reruns only if it mounts a different element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isReady;
}
