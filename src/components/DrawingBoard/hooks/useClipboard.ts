import { useRef } from "react";
import type { Canvas } from "fabric";
import type { FabricMods } from "../types";
import type { SaveableObj } from "./useBoardSync";

type GifMeta = {
  giphyId:          string;
  _gifUrl:          string;
  _gifSpritesheet:  HTMLCanvasElement;
  _gifFrameWidth:   number;
  _gifFrameHeight:  number;
  _gifTotalFrames:  number;
  _gifDelays:       number[];
};

const BLANK_PX = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const PASTE_OFFSET = 20;

interface UseClipboardOptions {
  fabricRef:    React.MutableRefObject<Canvas | null>;
  modsRef:      React.MutableRefObject<FabricMods | null>;
  saveObject:   (obj: SaveableObj) => void;
  startGifLoop: () => void;
  gifCountRef:  React.MutableRefObject<number>;
}

export interface UseClipboardReturn {
  copy:          () => void;
  paste:         () => void;
  clipboardRef:  React.MutableRefObject<{ clone: unknown; gifMeta?: GifMeta }[]>;
  isPastingRef:  React.MutableRefObject<boolean>;
}

/**
 * Copy / paste for Fabric objects.
 * – copy() clones the current selection into an in-memory clipboard.
 * – paste() offsets the clones and adds them to the canvas.
 * GIF animation data is preserved across paste operations.
 */
export function useClipboard({
  fabricRef,
  modsRef,
  saveObject,
  startGifLoop,
  gifCountRef,
}: UseClipboardOptions): UseClipboardReturn {
  const clipboardRef  = useRef<{ clone: unknown; gifMeta?: GifMeta }[]>([]);
  const isPastingRef  = useRef(false);

  const saveRef   = useRef(saveObject);
  const startRef  = useRef(startGifLoop);
  saveRef.current  = saveObject;
  startRef.current = startGifLoop;

  const copy = useRef(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const objs = fc.getActiveObjects();
    if (!objs.length) return;
    Promise.all(objs.map(o => (o as unknown as { clone(): Promise<unknown> }).clone()))
      .then(clones => {
        clipboardRef.current = clones.map((clone, i) => {
          const src = objs[i] as unknown as Record<string, unknown>;
          if (!src.giphyId) return { clone };
          return {
            clone,
            gifMeta: {
              giphyId:          src.giphyId          as string,
              _gifUrl:          src._gifUrl          as string,
              _gifSpritesheet:  src._gifSpritesheet  as HTMLCanvasElement,
              _gifFrameWidth:   src._gifFrameWidth   as number,
              _gifFrameHeight:  src._gifFrameHeight  as number,
              _gifTotalFrames:  src._gifTotalFrames  as number,
              _gifDelays:       src._gifDelays       as number[],
            },
          };
        });
      });
  }).current;

  const paste = useRef(() => {
    const fc   = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods || !clipboardRef.current.length) return;

    // Re-clone from clipboard so multiple pastes work.
    Promise.all(clipboardRef.current.map(({ clone }) =>
      (clone as unknown as { clone(): Promise<unknown> }).clone()
    )).then(clones => {
      isPastingRef.current = true;
      fc.discardActiveObject();

      let hasNewGif = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (clones as any[]).forEach((clone, i) => {
        const { gifMeta } = clipboardRef.current[i];
        // Fresh ID so saveObject creates a new record.
        (clone as Record<string, unknown>).boardObjectId = undefined;
        clone.set({
          left: (clone.left ?? 0) + PASTE_OFFSET,
          top:  (clone.top  ?? 0) + PASTE_OFFSET,
        });

        if (gifMeta) {
          const o = clone as unknown as Record<string, unknown>;
          o.giphyId           = gifMeta.giphyId;
          o._gifUrl           = gifMeta._gifUrl;
          o._gifSpritesheet   = gifMeta._gifSpritesheet;
          o._gifFrameWidth    = gifMeta._gifFrameWidth;
          o._gifFrameHeight   = gifMeta._gifFrameHeight;
          o._gifTotalFrames   = gifMeta._gifTotalFrames;
          o._gifDelays        = gifMeta._gifDelays;
          o._gifCurrentFrame  = 0;
          o._gifLastFrameTime = performance.now();
          clone.set({ cropX: 0, objectCaching: false });
          (clone as unknown as { setElement: (el: HTMLCanvasElement) => void })
            .setElement(gifMeta._gifSpritesheet);
          const _orig = clone.toObject.bind(clone);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (clone as Record<string, unknown>).toObject = (props?: any) => ({ ..._orig(props), src: BLANK_PX });
          gifCountRef.current += 1;
          hasNewGif = true;
        }

        fc.add(clone);
        saveRef.current(clone as unknown as SaveableObj);
      });

      if (clones.length === 1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fc.setActiveObject(clones[0] as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sel = new mods.ActiveSelection(clones as any, { canvas: fc });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fc.setActiveObject(sel as any);
      }
      fc.requestRenderAll();
      isPastingRef.current = false;
      if (hasNewGif) startRef.current();
    });
  }).current;

  return { copy, paste, clipboardRef, isPastingRef };
}
