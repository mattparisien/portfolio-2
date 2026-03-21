import { useCallback } from "react";
import type { MutableRefObject } from "react";
import type { Canvas } from "fabric";
import { BOARD_ID } from "../constants";
import type { RoomEvent } from "@/liveblocks.config";

export type SaveableObj = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toObject: (propertiesToInclude?: any[]) => object;
  boardObjectId?: string;
  giphyId?: string;
  _gifUrl?: string;
  zIndex?: number;
};

interface UseBoardSyncOptions {
  broadcast?: (event: RoomEvent) => void;
  fabricRef?: MutableRefObject<Canvas | null>;
}

/** Persists a single Fabric object to the backend (upsert by boardObjectId). */
export function useBoardSync({ broadcast, fabricRef }: UseBoardSyncOptions = {}) {
  const saveObject = useCallback((obj: SaveableObj) => {
    if (!obj.boardObjectId) {
      (obj as Record<string, unknown>).boardObjectId = crypto.randomUUID();
    }
    const objectId = obj.boardObjectId as string;

    // Derive zIndex from the object's actual canvas stack position so it always
    // reflects the live order — even after bracket-key reorders or drags.
    const fc = fabricRef?.current;
    const canvasIdx = fc
      ? fc.getObjects().indexOf(obj as unknown as Parameters<typeof fc.getObjects>[0])
      : -1;
    const zIndex = canvasIdx !== -1 ? canvasIdx : obj.zIndex;

    const LOCK_PROPS = ['lockMovementX', 'lockMovementY', 'lockRotation', 'lockScalingX', 'lockScalingY', 'hasControls'];
    const fabricJSON = JSON.stringify({
      ...(obj.toObject(LOCK_PROPS)),
      boardObjectId: objectId,
      ...(obj.giphyId             ? { giphyId:          obj.giphyId         } : {}),
      ...(obj._gifUrl             ? { _gifUrl:           obj._gifUrl         } : {}),
      ...(zIndex !== undefined    ? { zIndex                                 } : {}),
    });
    fetch("/api/board-objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: BOARD_ID, objectId, fabricJSON }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`saveObject HTTP ${r.status}`);
        broadcast?.({ type: "OBJECT_UPSERTED", objectId, fabricJSON });
      })
      .catch(console.error);
  }, [broadcast, fabricRef]);

  return { saveObject };
}
