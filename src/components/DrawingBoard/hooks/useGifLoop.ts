import { useRef, useCallback } from "react";
import type { MutableRefObject } from "react";
import type { Canvas } from "fabric";

/** Runs a requestAnimationFrame loop that keeps calling requestRenderAll()
 *  so fabric repaints animated GIF frames each tick. */
export function useGifLoop(fabricRef: MutableRefObject<Canvas | null>) {
  const gifCountRef = useRef(0);
  const gifRafRef   = useRef<number | null>(null);

  const startGifLoop = useCallback(() => {
    if (gifRafRef.current !== null) return;
    const loop = () => {
      fabricRef.current?.requestRenderAll();
      gifRafRef.current = requestAnimationFrame(loop);
    };
    gifRafRef.current = requestAnimationFrame(loop);
  }, [fabricRef]);

  const stopGifLoop = useCallback(() => {
    if (gifRafRef.current !== null) {
      cancelAnimationFrame(gifRafRef.current);
      gifRafRef.current = null;
    }
  }, []);

  return { gifCountRef, startGifLoop, stopGifLoop };
}
