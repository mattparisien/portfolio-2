import { useEffect, useRef } from "react";
import type { Canvas } from "fabric";
import { MIN_ZOOM, MAX_ZOOM } from "./useFabricInit";

interface UseTouchHandlingOptions {
  fabricRef: React.MutableRefObject<Canvas | null>;
  isReady:   boolean;
  setZoom:   (z: number) => void;
  setVpt:    (vpt: number[]) => void;
}

/**
 * Registers touch event listeners on Fabric's upperCanvasEl (the real pointer
 * event target) to support:
 *   – 1-finger tap    → select objects (pointerdown on touchstart, pointerup+click on touchend)
 *   – 1-finger drag   → pan canvas (pointercancel cancels Fabric's marquee, then relativePan)
 *   – 2-finger drag   → pan via midpoint delta
 *   – 2-finger pinch  → zoom to midpoint
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

    let lastMid:       { x: number; y: number } | null = null;
    let lastPinchDist: number | null = null;
    let tapStart:      { x: number; y: number } | null = null;
    let tapMoved       = false;

    const pinchDist = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
        lastMid = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        lastPinchDist = pinchDist(e.touches[0], e.touches[1]);
        tapStart = null;
      } else if (isTouchDevice && e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        tapStart = { x: t.clientX, y: t.clientY };
        tapMoved = false;
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
        const dx = tx - tapStart.x;
        const dy = ty - tapStart.y;
        if (!tapMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          tapMoved = true;
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
      if (isTouchDevice && e.changedTouches.length === 1 && tapStart && !tapMoved) {
        const t = e.changedTouches[0];
        // Fire the full down→up sequence only on a confirmed tap (not a drag)
        upperEl.dispatchEvent(new PointerEvent("pointerdown", {
          clientX: t.clientX, clientY: t.clientY,
          bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0,
        }));
        upperEl.dispatchEvent(new PointerEvent("pointerup", {
          clientX: t.clientX, clientY: t.clientY,
          bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0,
        }));
        upperEl.dispatchEvent(new MouseEvent("click", {
          clientX: t.clientX, clientY: t.clientY,
          bubbles: true, cancelable: true, button: 0,
        }));
      }
      if (e.touches.length === 0) {
        lastMid = null; lastPinchDist = null; tapStart = null; tapMoved = false;
      } else if (e.touches.length === 1) {
        lastMid = null; lastPinchDist = null;
        tapStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        tapMoved = false;
      }
    };

    upperEl.addEventListener("touchstart", onTouchStart, { passive: false });
    upperEl.addEventListener("touchmove",  onTouchMove,  { passive: false });
    upperEl.addEventListener("touchend",   onTouchEnd);

    return () => {
      upperEl.removeEventListener("touchstart", onTouchStart);
      upperEl.removeEventListener("touchmove",  onTouchMove);
      upperEl.removeEventListener("touchend",   onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);
}
