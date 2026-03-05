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

    const loop = (timestamp: number) => {
      const fc = fabricRef.current;
      if (fc) {
        fc.getObjects().forEach((obj) => {
          const o = obj as unknown as Record<string, unknown>;
          if (!o.giphyId) return;

          const delays        = o._gifDelays       as number[];
          const totalFrames   = o._gifTotalFrames  as number;
          const frameWidth    = o._gifFrameWidth   as number;
          const currentFrame  = (o._gifCurrentFrame  as number) ?? 0;
          const lastFrameTime = (o._gifLastFrameTime as number) ?? 0;
          const delay         = delays?.[currentFrame] ?? 100;

          if (timestamp - lastFrameTime >= delay) {
            const next = (currentFrame + 1) % totalFrames;
            o._gifCurrentFrame  = next;
            o._gifLastFrameTime = timestamp;
            // Scroll the spritesheet to the new frame
            (obj as unknown as { cropX: number }).cropX = next * frameWidth;
            (obj as unknown as { dirty: boolean }).dirty = true;
          }
        });
        fc.requestRenderAll();
      }
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
