import { useEffect, useRef } from "react";
import type { Canvas } from "fabric";
import type { FabricMods } from "../types";
import { decodeGif } from "../gifDecoder";

interface UseCanvasLoadOptions {
  fabricRef:    React.MutableRefObject<Canvas | null>;
  modsRef:      React.MutableRefObject<FabricMods | null>;
  isReady:      boolean;
  initialObjects: { fabricJSON: string }[];
  setIsSyncing: (v: boolean) => void;
  startGifLoop: () => void;
  gifCountRef:  React.MutableRefObject<number>;
  videoCountRef?: React.MutableRefObject<number>;
}

/**
 * Restores persisted board objects onto the Fabric canvas once it's ready.
 * Handles regular objects, GIF spritesheets, and video elements.
 */
export function useCanvasLoad({
  fabricRef,
  modsRef,
  isReady,
  initialObjects,
  setIsSyncing,
  startGifLoop,
  gifCountRef,
  videoCountRef,
}: UseCanvasLoadOptions): void {
  // Keep a stable ref to initialObjects so the effect only fires on isReady change.
  const objectsRef = useRef(initialObjects);
  objectsRef.current = initialObjects;

  useEffect(() => {
    if (!isReady) return;
    const fc   = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    const objects = objectsRef.current;
    if (!Array.isArray(objects) || objects.length === 0) {
      setIsSyncing(false);
      return;
    }

    void (async () => {
      const parsed = objects.map(o => JSON.parse(o.fabricJSON)) as Record<string, unknown>[];
      // Restore in persisted z-order
      parsed.sort((a, b) => ((a.zIndex as number) ?? 0) - ((b.zIndex as number) ?? 0));
      // Text objects should not be editable until double-clicked
      parsed.forEach(o => {
        if (["IText", "i-text", "Textbox", "textbox"].includes(o.type as string)) {
          o.editable = false;
        }
      });

      const nonVideoParsed = parsed.filter(o => !o._isVideo);
      const videoParsed    = parsed.filter(o =>  o._isVideo && o._videoUrl);

      setIsSyncing(false);

      // ── Enliven regular + GIF objects ──────────────────────────────
      if (nonVideoParsed.length > 0) {
        const enlivened = await mods.util.enlivenObjects(nonVideoParsed);
        let hasGifs = false;
        const gifDecodePromises: Promise<void>[] = [];

        (enlivened as unknown[]).forEach((obj, i) => {
          const src = nonVideoParsed[i];
          if (src.boardObjectId) (obj as Record<string, unknown>).boardObjectId = src.boardObjectId;
          if (src.zIndex !== undefined) (obj as Record<string, unknown>).zIndex  = src.zIndex;
          fc.add(obj as Parameters<typeof fc.add>[0]);

          if (src.giphyId && src._gifUrl) {
            (obj as Record<string, unknown>).giphyId = src.giphyId;
            gifCountRef.current += 1;
            hasGifs = true;

            const gifUrl = src._gifUrl as string;
            gifDecodePromises.push(
              fetch(gifUrl)
                .then(r => r.arrayBuffer())
                .then(buffer => {
                  const { spritesheet, frameWidth, frameHeight, totalFrames, delays } = decodeGif(buffer);
                  const fi = obj as unknown as {
                    setElement: (el: HTMLCanvasElement) => void;
                    set: (p: Record<string, unknown>) => void;
                    dirty: boolean;
                  };
                  fi.setElement(spritesheet);
                  fi.set({ width: frameWidth, height: frameHeight, cropX: 0, cropY: 0, objectCaching: false });
                  const o = obj as unknown as Record<string, unknown>;
                  o._gifUrl           = gifUrl;
                  o._gifSpritesheet   = spritesheet;
                  o._gifFrameWidth    = frameWidth;
                  o._gifFrameHeight   = frameHeight;
                  o._gifTotalFrames   = totalFrames;
                  o._gifDelays        = delays;
                  o._gifCurrentFrame  = 0;
                  o._gifLastFrameTime = performance.now();
                  fi.dirty            = true;
                  fc.requestRenderAll();
                })
                .catch(e => console.error("[GIF] reload failed:", e))
            );
          }
        });

        fc.requestRenderAll();
        if (hasGifs) Promise.allSettled(gifDecodePromises).then(() => startGifLoop());
      }

      // ── Restore video objects ──────────────────────────────────────
      if (videoParsed.length > 0) {
        const { FabricImage } = mods;
        const restorePromises = videoParsed.map(async src => {
          const videoUrl = src._videoUrl as string;
          const video    = document.createElement("video");
          video.muted = true; video.loop = true; video.playsInline = true; video.src = videoUrl;
          await new Promise<void>(resolve => {
            video.onloadedmetadata = () => resolve();
            video.onerror          = () => resolve();
          });
          video.play().catch(() => {});
          const w = video.videoWidth  || (src.width  as number) || 640;
          const h = video.videoHeight || (src.height as number) || 360;
          video.width = w; video.height = h;

          const imgObj = new FabricImage(video as unknown as HTMLImageElement, {
            left:          (src.left   as number) ?? 0,
            top:           (src.top    as number) ?? 0,
            scaleX:        (src.scaleX as number) ?? 1,
            scaleY:        (src.scaleY as number) ?? 1,
            angle:         (src.angle  as number) ?? 0,
            flipX:         (src.flipX  as boolean) ?? false,
            flipY:         (src.flipY  as boolean) ?? false,
            opacity:       (src.opacity as number) ?? 1,
            originX:       (src.originX as "left"  | "center" | "right") ?? "left",
            originY:       (src.originY as "top"   | "center" | "bottom") ?? "top",
            width:         w,
            height:        h,
            objectCaching: false,
            selectable:    true,
            hasControls:   true,
            lockMovementX: (src.lockMovementX as boolean) ?? false,
            lockMovementY: (src.lockMovementY as boolean) ?? false,
            lockRotation:  (src.lockRotation  as boolean) ?? false,
            lockScalingX:  (src.lockScalingX  as boolean) ?? false,
            lockScalingY:  (src.lockScalingY  as boolean) ?? false,
          });

          const o = imgObj as unknown as Record<string, unknown>;
          if (src.boardObjectId) o.boardObjectId = src.boardObjectId;
          if (src.zIndex !== undefined) o.zIndex  = src.zIndex;
          o._isVideo  = true;
          o._videoUrl = videoUrl;
          o._videoEl  = video;

          const _origToObject = imgObj.toObject.bind(imgObj);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (o as Record<string, unknown>).toObject = (props?: any) => ({
            ..._origToObject(props),
            src: "data:,",
            _isVideo:  true,
            _videoUrl: videoUrl,
          });

          fc.add(imgObj);
          if (videoCountRef) videoCountRef.current += 1;
          // Return {imgObj, src} — canvas insertion is done after allSettled so
          // we can place each video at its correct z-order position.
          return { imgObj, src };
        });

        Promise.allSettled(restorePromises).then(results => {
          // Sort fulfilled results by stored zIndex, then insert in that order
          // so each moveObjectTo call doesn't shift already-placed objects.
          type VideoResult = { imgObj: InstanceType<typeof FabricImage>; src: Record<string, unknown> };
          (results as PromiseSettledResult<VideoResult>[])
            .filter((r): r is PromiseFulfilledResult<VideoResult> => r.status === "fulfilled")
            .map(r => r.value)
            .sort((a, b) => ((a.src.zIndex as number) ?? 0) - ((b.src.zIndex as number) ?? 0))
            .forEach(({ imgObj, src }) => {
              // The object's index in the pre-sorted `parsed` array is its
              // intended absolute canvas position.
              const targetIdx = parsed.findIndex(p => p.boardObjectId === src.boardObjectId);
              const clamp = Math.min(
                targetIdx >= 0 ? targetIdx : fc.getObjects().length - 1,
                fc.getObjects().length - 1,
              );
              if (clamp < fc.getObjects().length - 1) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (fc as any).moveObjectTo(imgObj, clamp);
              }
            });

          startGifLoop();
          fc.requestRenderAll();
        });
      }
    })()
      .catch(e => console.error("Failed to load board objects", e))
      .finally(() => { fc.renderAll(); });
    // Only re-run when the canvas becomes ready (initialObjects is captured via ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);
}
