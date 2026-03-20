import { useRef, useCallback } from "react";
import type { MutableRefObject } from "react";
import type { Canvas, FabricObject } from "fabric";

/** Runs a requestAnimationFrame loop that keeps calling requestRenderAll()
 *  so fabric repaints animated GIF frames and video frames each tick. */
export function useGifLoop(fabricRef: MutableRefObject<Canvas | null>) {
  const gifCountRef    = useRef(0);
  const videoCountRef  = useRef(0);
  const gifRafRef      = useRef<number | null>(null);
  const isDraggingRef  = useRef(false);

  const startGifLoop = useCallback(() => {
    if (gifRafRef.current !== null) return;

    const loop = (timestamp: number) => {
      const fc = fabricRef.current;
      if (fc) {
        // Check if Fabric is actively transforming (dragging/scaling/rotating).
        // If so, skip requestRenderAll — Fabric drives rendering itself during
        // transforms and our extra call disrupts its pointer-tracking state.
        const isTransforming = !!(fc as unknown as Record<string, unknown>)._currentTransform;

        fc.getObjects().forEach((obj) => {
          const o = obj as unknown as Record<string, unknown>;

          // ── Video objects: always blit current frame to offscreen canvas ──
          // Blitting is harmless during drag (off-screen pixels only).
          // Fabric picks up the dirty flag when it renders on its own tick.
          if (o._videoUrl) {
            const videoEl   = o._videoEl   as HTMLVideoElement | undefined;
            const offscreen = o._videoCanvas as HTMLCanvasElement | undefined;
            if (videoEl && offscreen && !videoEl.paused && !videoEl.ended) {
              const ctx2d = offscreen.getContext("2d");
              if (ctx2d) ctx2d.drawImage(videoEl, 0, 0, offscreen.width, offscreen.height);
            }
            (obj as unknown as { dirty: boolean }).dirty = true;
            return;
          }

          // ── GIF objects: advance frame on schedule ────────────────────
          if (!o.giphyId) return;

          const delays        = o._gifDelays       as number[];
          const totalFrames   = o._gifTotalFrames  as number;
          const frameWidth    = o._gifFrameWidth   as number;
          // Skip objects whose metadata hasn't been decoded yet (e.g. during reload)
          if (!delays || !totalFrames || !frameWidth) return;
          const currentFrame  = (o._gifCurrentFrame  as number) ?? 0;
          const lastFrameTime = (o._gifLastFrameTime as number) ?? 0;
          const delay         = delays?.[currentFrame] ?? 100;

          if (timestamp - lastFrameTime >= delay) {
            const next = (currentFrame + 1) % totalFrames;
            o._gifCurrentFrame  = next;
            o._gifLastFrameTime = timestamp;
            // Use obj.set() so Fabric tracks the change, then mark dirty
            (obj as FabricObject).set({ cropX: next * frameWidth });
            (obj as unknown as { dirty: boolean }).dirty = true;
          }
        });

        // Only drive rendering from here when Fabric isn't already doing it
        if (!isTransforming) {
          fc.requestRenderAll();
        }
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

  return { gifCountRef, videoCountRef, isDraggingRef, startGifLoop, stopGifLoop };
}
