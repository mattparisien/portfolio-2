import { useEffect, useRef } from "react";
import type { Canvas, FabricObject } from "fabric";
import { MIN_ZOOM, MAX_ZOOM } from "./useFabricInit";

interface UseTouchHandlingOptions {
  fabricRef: React.MutableRefObject<Canvas | null>;
  isReady:   boolean;
  setZoom:   (z: number) => void;
  setVpt:    (vpt: number[]) => void;
}

/** Duration (ms) the user must hold before an object enters move mode. */
const HOLD_DURATION_MS = 2000;
/** Scale factor applied to an object while in hold-move mode. */
const HOLD_SCALE = 0.85;

/**
 * Registers touch event listeners on Fabric's upperCanvasEl to support:
 *   – 1-finger tap         → select objects
 *   – 1-finger drag        → pan canvas
 *   – 1-finger hold (2 s)  → hold-to-move: object scales down, follows finger, drops on release
 *   – 2-finger drag        → pan via midpoint delta
 *   – 2-finger pinch       → zoom to midpoint
 *   – double-tap           → re-enter text editing (dispatches dblclick equivalent)
 */
export function useTouchHandling({
  fabricRef,
  isReady,
  setZoom,
  setVpt,
}: UseTouchHandlingOptions): void {
  const setZoomRef = useRef(setZoom);
  const setVptRef  = useRef(setVpt);
  setZoomRef.current = setZoom;
  setVptRef.current  = setVpt;

  useEffect(() => {
    if (!isReady) return;
    const fc = fabricRef.current;
    if (!fc) return;

    const upperEl = (fc as unknown as { upperCanvasEl: HTMLElement }).upperCanvasEl;
    const isTouchDevice = navigator.maxTouchPoints > 0;

    // ─── 2-finger / pinch state ───────────────────────────────────────────
    let lastMid:       { x: number; y: number } | null = null;
    let lastPinchDist: number | null = null;

    // ─── Tap state ────────────────────────────────────────────────────────
    let tapStart:   { x: number; y: number } | null = null;
    let tapMoved    = false;
    let lastTapTime = 0;
    let lastTapPos: { x: number; y: number } | null = null;
    const DOUBLE_TAP_MS   = 350;
    const DOUBLE_TAP_SLOP = 32;

    // ─── Hold-to-move state ───────────────────────────────────────────────
    let holdTimer:     ReturnType<typeof setTimeout> | null = null;
    let holdMoveMode   = false;
    let holdObject:    FabricObject | null = null;
    let holdOrigScaleX = 1;
    let holdOrigScaleY = 1;
    let holdLastScene: { x: number; y: number } | null = null;

    // ─── Helpers ──────────────────────────────────────────────────────────

    const pinchDist = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    /** Convert client (viewport) coordinates to Fabric scene coordinates. */
    const toScene = (clientX: number, clientY: number) => {
      const rect = upperEl.getBoundingClientRect();
      const vpt  = fc.viewportTransform as number[];
      return {
        x: (clientX - rect.left - vpt[4]) / vpt[0],
        y: (clientY - rect.top  - vpt[5]) / vpt[3],
      };
    };

    /** Cancel any pending hold timer. */
    const cancelHold = () => {
      if (holdTimer !== null) { clearTimeout(holdTimer); holdTimer = null; }
    };

    /**
     * Exit hold-move mode. Restores the original scale, re-renders, and
     * optionally fires `before:transform` + `object:modified` so the position
     * change propagates through the existing save/undo pipeline.
     */
    const releaseHoldMove = (save: boolean) => {
      if (!holdObject) { holdMoveMode = false; holdLastScene = null; return; }
      holdObject.set({ scaleX: holdOrigScaleX, scaleY: holdOrigScaleY });
      holdObject.setCoords();
      fc.requestRenderAll();
      if (save) {
        // Snapshot current state as the "before" for undo, then fire modified.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fc as any).fire("before:transform", { transform: { target: holdObject } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fc as any).fire("object:modified", { target: holdObject });
      }
      holdObject    = null;
      holdMoveMode  = false;
      holdLastScene = null;
    };

    // ─── Event handlers ───────────────────────────────────────────────────

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
        e.stopImmediatePropagation();
        cancelHold();
        if (holdMoveMode) releaseHoldMove(false);
        lastMid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        lastPinchDist = pinchDist(e.touches[0], e.touches[1]);
        tapStart = null;
      } else if (isTouchDevice && e.touches.length === 1) {
        // Block native touch→mouse synthesis; we dispatch MouseEvents ourselves
        // so we can control exactly when Fabric sees them.
        e.preventDefault();
        e.stopImmediatePropagation();
        const t = e.touches[0];
        tapStart = { x: t.clientX, y: t.clientY };
        tapMoved = false;

        const now = Date.now();
        const isDoubleTap =
          now - lastTapTime < DOUBLE_TAP_MS &&
          lastTapPos !== null &&
          Math.abs(t.clientX - lastTapPos.x) < DOUBLE_TAP_SLOP &&
          Math.abs(t.clientY - lastTapPos.y) < DOUBLE_TAP_SLOP;

        if (isDoubleTap) {
          // Fire mouse events so Fabric handles double-tap (e.g. re-enter text editing)
          upperEl.dispatchEvent(new MouseEvent("mousedown", {
            clientX: t.clientX, clientY: t.clientY,
            bubbles: true, cancelable: true, button: 0,
          }));
          upperEl.dispatchEvent(new MouseEvent("mouseup", {
            clientX: t.clientX, clientY: t.clientY,
            bubbles: true, cancelable: true, button: 0,
          }));
          upperEl.dispatchEvent(new MouseEvent("click", {
            clientX: t.clientX, clientY: t.clientY,
            bubbles: true, cancelable: true, button: 0,
          }));
          lastTapTime = 0;
          lastTapPos  = null;
          tapStart    = null;
        } else {
          lastTapTime = now;
          lastTapPos  = { x: t.clientX, y: t.clientY };

          // Start the hold timer. If the finger stays still for HOLD_DURATION_MS
          // and is resting on a movable object, enter hold-move mode.
          holdTimer = setTimeout(() => {
            holdTimer = null;
            if (!tapStart || tapMoved) return; // drag started — bail out

            // Find the topmost hittable Fabric object at the touch position.
            const fakeEv = new MouseEvent("mousemove", {
              clientX: tapStart.x, clientY: tapStart.y, bubbles: false,
            });
            const target = (fc as unknown as {
              findTarget(e: MouseEvent): FabricObject | undefined;
            }).findTarget(fakeEv);

            if (
              target &&
              target.selectable !== false &&
              !target.lockMovementX &&
              !target.lockMovementY
            ) {
              holdObject     = target;
              holdOrigScaleX = target.scaleX ?? 1;
              holdOrigScaleY = target.scaleY ?? 1;

              // Scale the object down to visually signal it is now in move mode.
              target.set({
                scaleX: holdOrigScaleX * HOLD_SCALE,
                scaleY: holdOrigScaleY * HOLD_SCALE,
              });
              target.setCoords();
              fc.setActiveObject(target);
              fc.requestRenderAll();

              holdMoveMode  = true;
              holdLastScene = toScene(tapStart.x, tapStart.y);

              // Haptic pulse on devices that support it (Android Chrome).
              if (typeof navigator.vibrate === "function") navigator.vibrate(40);
            }
          }, HOLD_DURATION_MS);
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && lastMid) {
        e.preventDefault();
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        // Pan via midpoint delta
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fc as any).relativePan({ x: cx - lastMid.x, y: cy - lastMid.y });
        // Pinch zoom
        if (lastPinchDist !== null) {
          const newDist = pinchDist(e.touches[0], e.touches[1]);
          if (newDist > 0 && lastPinchDist > 0) {
            const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fc.getZoom() * (newDist / lastPinchDist)));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (fc as any).zoomToPoint({ x: cx, y: cy }, newZoom);
            setZoomRef.current(newZoom);
            lastPinchDist = newDist;
          }
        }
        setVptRef.current(fc.viewportTransform as number[]);
        lastMid = { x: cx, y: cy };
      } else if (isTouchDevice && e.touches.length === 1 && tapStart) {
        e.preventDefault();
        const tx = e.touches[0].clientX;
        const ty = e.touches[0].clientY;

        // ── Hold-move: translate the held object ──────────────────────────
        if (holdMoveMode && holdObject && holdLastScene) {
          const scene = toScene(tx, ty);
          holdObject.set({
            left: (holdObject.left ?? 0) + (scene.x - holdLastScene.x),
            top:  (holdObject.top  ?? 0) + (scene.y - holdLastScene.y),
          });
          holdObject.setCoords();
          fc.requestRenderAll();
          holdLastScene = scene;
          tapStart = { x: tx, y: ty };
          return;
        }

        // ── Normal single-finger pan ──────────────────────────────────────
        const dx = tx - tapStart.x;
        const dy = ty - tapStart.y;
        if (!tapMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          tapMoved = true;
          cancelHold(); // user started dragging — cancel the hold timer
        }
        if (tapMoved) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (fc as any).relativePan({ x: dx, y: dy });
          setVptRef.current(fc.viewportTransform as number[]);
        }
        tapStart = { x: tx, y: ty };
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      cancelHold();

      // ── Release hold-move: drop the object and persist its position ─────
      if (holdMoveMode) {
        releaseHoldMove(true);
        tapStart = null;
        tapMoved = false;
        return;
      }

      if (e.touches.length === 0) {
        // Single-tap (finger lifted without dragging) → select object via Fabric
        if (!tapMoved && tapStart) {
          upperEl.dispatchEvent(new MouseEvent("mousedown", {
            clientX: tapStart.x, clientY: tapStart.y,
            bubbles: true, cancelable: true, button: 0,
          }));
          upperEl.dispatchEvent(new MouseEvent("mouseup", {
            clientX: tapStart.x, clientY: tapStart.y,
            bubbles: true, cancelable: true, button: 0,
          }));
          upperEl.dispatchEvent(new MouseEvent("click", {
            clientX: tapStart.x, clientY: tapStart.y,
            bubbles: true, cancelable: true, button: 0,
          }));
        }
        lastMid = null; lastPinchDist = null; tapStart = null; tapMoved = false;
      } else if (e.touches.length === 1) {
        // Transitioned from 2-finger → 1-finger; resume 1-finger tracking
        lastMid = null; lastPinchDist = null;
        tapStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        tapMoved = false;
      }
    };

    const onTouchCancel = () => {
      cancelHold();
      if (holdMoveMode) releaseHoldMove(false);
      lastMid = null; lastPinchDist = null; tapStart = null; tapMoved = false;
    };

    upperEl.addEventListener("touchstart",  onTouchStart,  { capture: true, passive: false });
    upperEl.addEventListener("touchmove",   onTouchMove,   { passive: false });
    upperEl.addEventListener("touchend",    onTouchEnd);
    upperEl.addEventListener("touchcancel", onTouchCancel);

    return () => {
      upperEl.removeEventListener("touchstart",  onTouchStart, { capture: true });
      upperEl.removeEventListener("touchmove",   onTouchMove);
      upperEl.removeEventListener("touchend",    onTouchEnd);
      upperEl.removeEventListener("touchcancel", onTouchCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);
}
