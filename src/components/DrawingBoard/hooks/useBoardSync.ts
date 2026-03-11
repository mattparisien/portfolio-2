import { useCallback } from "react";
import { BOARD_ID } from "../constants";
import type { RoomEvent } from "@/liveblocks.config";

export type SaveableObj = {
  toObject: () => object;
  boardObjectId?: string;
  giphyId?: string;
  _gifUrl?: string;
  zIndex?: number;
};

interface UseBoardSyncOptions {
  broadcast?: (event: RoomEvent) => void;
}

/** Persists a single Fabric object to the backend (upsert by boardObjectId). */
export function useBoardSync({ broadcast }: UseBoardSyncOptions = {}) {
  const saveObject = useCallback((obj: SaveableObj) => {
    if (!obj.boardObjectId) {
      (obj as Record<string, unknown>).boardObjectId = crypto.randomUUID();
    }
    const objectId = obj.boardObjectId as string;
    const fabricJSON = JSON.stringify({
      ...(obj.toObject()),
      boardObjectId: objectId,
      ...(obj.giphyId             ? { giphyId:          obj.giphyId         } : {}),
      ...(obj._gifUrl             ? { _gifUrl:           obj._gifUrl         } : {}),
      ...(obj.zIndex !== undefined ? { zIndex:            obj.zIndex          } : {}),
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
  }, [broadcast]);

  return { saveObject };
}
