import { useRef, useCallback } from "react";
import type { MutableRefObject } from "react";
import type { Canvas, FabricObject } from "fabric";
import { drawAudioPlayer } from "../audioPlayerUI";

/** Runs a requestAnimationFrame loop that keeps calling requestRenderAll()
 *  so fabric repaints animated GIF frames and video frames each tick. */
export function useGifLoop(fabricRef: MutableRefObject<Canvas | null>) {
  const gifCountRef   = useRef(0);
  const videoCountRef = useRef(0);
  const audioCountRef = useRef(0);
  const gifRafRef     = useRef<number | null>(null);

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

        // ── Redraw audio player UI each frame ─────────────────────────────
        fc.getObjects().forEach((obj) => {
          const o = obj as unknown as Record<string, unknown>;
          if (!o._isAudio || !o._playerCanvas || !o._audioEl) return;
          const audio = o._audioEl as HTMLAudioElement;
          const progress = audio.duration > 0 ? audio.currentTime / audio.duration : 0;
          drawAudioPlayer(o._playerCanvas as HTMLCanvasElement, {
            trackName:  o._trackName  as string ?? "",
            isPlaying:  o._isPlaying  as boolean ?? false,
            progress,
          });
          (obj as unknown as { dirty: boolean }).dirty = true;
        });
        fc.requestRenderAll();
      }
      gifRafRef.current = requestAnimationFrame(loop);
    };

    gifRafRef.current = requestAnimationFrame(loop);
  }, [fabricRef]);

  const stopGifLoop = useCallback(() => {
    // Only cancel the loop when GIFs, videos, and audio are all gone
    if (gifCountRef.current > 0 || videoCountRef.current > 0 || audioCountRef.current > 0) return;
    if (gifRafRef.current !== null) {
      cancelAnimationFrame(gifRafRef.current);
      gifRafRef.current = null;
    }
  }, []);

  return { gifCountRef, videoCountRef, audioCountRef, startGifLoop, stopGifLoop };
}
