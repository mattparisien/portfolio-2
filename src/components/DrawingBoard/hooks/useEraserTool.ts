import { useEffect, useRef } from "react";
import type { Canvas } from "fabric";
import type { Tool } from "../types";
import { BOARD_ID } from "../constants";
import type { SaveableObj } from "./useBoardSync";
import type { RoomEvent } from "@/liveblocks.config";

interface UseEraserToolOptions {
  fabricRef:    React.MutableRefObject<Canvas | null>;
  isReady:      boolean;
  toolRef:      React.MutableRefObject<Tool>;
  gifCountRef:  React.MutableRefObject<number>;
  videoCountRef?: React.MutableRefObject<number>;
  broadcast?:   (event: RoomEvent) => void;
  pushUndo:     (entry: { type: "delete"; serialized: object; wasGif: boolean }) => void;
  stopGifLoop:  () => void;
}

/**
 * Erases whatever Fabric object is under the pointer while the mouse button
 * is held — dispatches an HTTP DELETE and broadcasts removal to other clients.
 */
export function useEraserTool({
  fabricRef,
  isReady,
  toolRef,
  gifCountRef,
  videoCountRef,
  broadcast,
  pushUndo,
  stopGifLoop,
}: UseEraserToolOptions): void {
  const broadcastRef  = useRef(broadcast);
  const pushUndoRef   = useRef(pushUndo);
  const stopRef       = useRef(stopGifLoop);
  broadcastRef.current  = broadcast;
  pushUndoRef.current   = pushUndo;
  stopRef.current       = stopGifLoop;

  useEffect(() => {
    if (!isReady) return;
    const fc = fabricRef.current;
    if (!fc) return;

    const isDownRef = { current: false };

    function eraseObject(obj: unknown) {
      const o = obj as unknown as SaveableObj & { giphyId?: string };
      if ((o as { lockMovementX?: boolean }).lockMovementX) return; // skip locked objects

      pushUndoRef.current({
        type: "delete",
        serialized: (o as unknown as { toObject(): object }).toObject(),
        wasGif: !!o.giphyId,
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (fc as Canvas).remove(obj as Parameters<Canvas["remove"]>[0]);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (fc as Canvas).requestRenderAll();

      const oid = (o as { boardObjectId?: string }).boardObjectId;
      if (oid) {
        fetch(`/api/board-objects?boardId=${BOARD_ID}&objectId=${encodeURIComponent(oid)}`, { method: "DELETE" })
          .then(() => broadcastRef.current?.({ type: "OBJECT_DELETED", objectId: oid }))
          .catch(console.error);
      }
      if (o.giphyId) {
        gifCountRef.current = Math.max(0, gifCountRef.current - 1);
        stopRef.current();
      }
      if ((o as Record<string, unknown>)._isVideo) {
        const vid = (o as Record<string, unknown>)._videoEl as HTMLVideoElement | undefined;
        vid?.pause();
        if (videoCountRef) videoCountRef.current = Math.max(0, videoCountRef.current - 1);
        stopRef.current();
      }
    }

    function eraseAtEvent(e: { e: Event }) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const pointer = (fc as Canvas).getScenePoint(e.e as MouseEvent);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const objects = (fc as Canvas).getObjects();
      // Work top-most first to erase the visually topmost object.
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i] as unknown as { containsPoint: (p: unknown) => boolean };
        if (obj.containsPoint(pointer)) { eraseObject(objects[i]); break; }
      }
    }

    const onMouseDown = (e: { e: Event }) => {
      if (toolRef.current !== "eraser") return;
      isDownRef.current = true;
      eraseAtEvent(e);
    };

    const onMouseMove = (e: { e: Event }) => {
      if (toolRef.current !== "eraser" || !isDownRef.current) return;
      eraseAtEvent(e);
    };

    const onMouseUp = () => {
      isDownRef.current = false;
    };

    fc.on("mouse:down", onMouseDown);
    fc.on("mouse:move", onMouseMove);
    fc.on("mouse:up",   onMouseUp);

    return () => {
      fc.off("mouse:down", onMouseDown);
      fc.off("mouse:move", onMouseMove);
      fc.off("mouse:up",   onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);
}
