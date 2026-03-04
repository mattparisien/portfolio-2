import { useCallback } from "react";
import { BOARD_ID } from "../constants";

export type SaveableObj = {
  toObject: () => object;
  boardObjectId?: string;
  giphyId?: string;
};

/** Persists a single Fabric object to the backend (upsert by boardObjectId). */
export function useBoardSync() {
  const saveObject = useCallback((obj: SaveableObj) => {
    if (!obj.boardObjectId) {
      (obj as Record<string, unknown>).boardObjectId = crypto.randomUUID();
    }
    const objectId = obj.boardObjectId as string;
    const fabricJSON = JSON.stringify({
      ...(obj.toObject()),
      boardObjectId: objectId,
      ...(obj.giphyId ? { giphyId: obj.giphyId } : {}),
    });
    fetch("/api/board-objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: BOARD_ID, objectId, fabricJSON }),
    })
      .then((r) => { if (!r.ok) throw new Error(`saveObject HTTP ${r.status}`); })
      .catch(console.error);
  }, []);

  return { saveObject };
}
