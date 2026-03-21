import { useRef } from "react";
import type { Canvas } from "fabric";
import type { FabricMods } from "../types";
import { BOARD_ID } from "../constants";
import type { SaveableObj } from "./useBoardSync";
import type { RoomEvent } from "@/liveblocks.config";

type UndoEntry =
  | { type: "add";    objectId: string; serialized: object }
  | { type: "delete"; serialized: object; wasGif: boolean }
  | { type: "modify"; objectId: string; before: object };

type RedoEntry =
  | { type: "add";    serialized: object; wasGif: boolean }
  | { type: "delete"; objectId: string;   wasGif: boolean }
  | { type: "modify"; objectId: string;   after: object };

const MAX_UNDO = 50;

interface UseUndoRedoOptions {
  fabricRef:    React.MutableRefObject<Canvas | null>;
  modsRef:      React.MutableRefObject<FabricMods | null>;
  saveObject:   (obj: SaveableObj) => void;
  broadcast?:   (event: RoomEvent) => void;
  startGifLoop: () => void;
  stopGifLoop:  () => void;
  gifCountRef:  React.MutableRefObject<number>;
}

export interface UseUndoRedoReturn {
  /** Push an entry onto the undo stack (clears redo). */
  pushUndo: (entry: UndoEntry) => void;
  /** Execute undo — pops from undo stack, reverses the action, pushes to redo. */
  executeUndo: () => void;
  /** Execute redo — pops from redo stack, re-applies, pushes to undo. */
  executeRedo: () => void;
  /** True while an undo/redo is executing — suppress side-effects in canvas listeners. */
  isUndoingRef: React.MutableRefObject<boolean>;
}

/**
 * Manages undo / redo stacks for add / delete / modify operations.
 * Returns stable callback refs — safe to call from canvas event handlers.
 */
export function useUndoRedo({
  fabricRef,
  modsRef,
  saveObject,
  broadcast,
  startGifLoop,
  stopGifLoop,
  gifCountRef,
}: UseUndoRedoOptions): UseUndoRedoReturn {
  const undoStack    = useRef<UndoEntry[]>([]);
  const redoStack    = useRef<RedoEntry[]>([]);
  const isUndoingRef = useRef(false);

  // Latest-value refs so stack operations always call current callbacks.
  const saveRef      = useRef(saveObject);
  const broadcastRef = useRef(broadcast);
  const startRef     = useRef(startGifLoop);
  const stopRef      = useRef(stopGifLoop);
  saveRef.current      = saveObject;
  broadcastRef.current = broadcast;
  startRef.current     = startGifLoop;
  stopRef.current      = stopGifLoop;

  const pushUndo = useRef((entry: UndoEntry) => {
    undoStack.current.push(entry);
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    redoStack.current.length = 0;
  }).current;

  const executeUndo = useRef(() => {
    const fc   = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    const entry = undoStack.current.pop();
    if (!entry) return;

    isUndoingRef.current = true;

    if (entry.type === "add") {
      const obj = fc.getObjects().find(
        o => (o as unknown as { boardObjectId?: string }).boardObjectId === entry.objectId
      );
      const snap  = obj ? (obj as unknown as { toObject(): object }).toObject() : entry.serialized;
      const isGif = !!(obj as { giphyId?: string } | null)?.giphyId;
      redoStack.current.push({ type: "add", serialized: snap, wasGif: isGif });
      if (obj) {
        fc.remove(obj);
        fc.discardActiveObject();
        fc.requestRenderAll();
      }
      if (entry.objectId) {
        fetch(`/api/board-objects?boardId=${BOARD_ID}&objectId=${encodeURIComponent(entry.objectId)}`, { method: "DELETE" })
          .then(() => broadcastRef.current?.({ type: "OBJECT_DELETED", objectId: entry.objectId }))
          .catch(console.error);
      }

    } else if (entry.type === "delete") {
      const oid = (entry.serialized as Record<string, unknown>).boardObjectId as string | undefined;
      redoStack.current.push({ type: "delete", objectId: oid ?? "", wasGif: entry.wasGif });
      mods.util.enlivenObjects([entry.serialized]).then((objs: unknown[]) => {
        const obj = objs[0] as unknown as SaveableObj;
        if (!obj) return;
        fc.add(obj as Parameters<typeof fc.add>[0]);
        fc.requestRenderAll();
        saveRef.current(obj);
        if (entry.wasGif) { gifCountRef.current += 1; startRef.current(); }
      }).catch(console.error);

    } else if (entry.type === "modify") {
      const obj = fc.getObjects().find(
        o => (o as unknown as { boardObjectId?: string }).boardObjectId === entry.objectId
      );
      if (obj) {
        const after = (obj as unknown as { toObject(): object }).toObject();
        redoStack.current.push({ type: "modify", objectId: entry.objectId, after });
        obj.set(entry.before as Parameters<typeof obj.set>[0]);
        obj.setCoords();
        fc.requestRenderAll();
        saveRef.current(obj as unknown as SaveableObj);
      }
    }

    isUndoingRef.current = false;
  }).current;

  const executeRedo = useRef(() => {
    const fc   = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    const entry = redoStack.current.pop();
    if (!entry) return;

    isUndoingRef.current = true;

    if (entry.type === "add") {
      mods.util.enlivenObjects([entry.serialized]).then((objs: unknown[]) => {
        const obj = objs[0] as unknown as SaveableObj;
        if (!obj) return;
        fc.add(obj as Parameters<typeof fc.add>[0]);
        fc.requestRenderAll();
        saveRef.current(obj);
        if (entry.wasGif) { gifCountRef.current += 1; startRef.current(); }
        setTimeout(() => {
          const oid = obj.boardObjectId;
          if (oid) undoStack.current.push({ type: "add", objectId: oid, serialized: (obj as unknown as { toObject(): object }).toObject() });
        }, 0);
      }).catch(console.error);

    } else if (entry.type === "delete") {
      const obj = fc.getObjects().find(
        o => (o as unknown as { boardObjectId?: string }).boardObjectId === entry.objectId
      );
      if (obj) {
        const isGif = !!(obj as { giphyId?: string }).giphyId;
        undoStack.current.push({ type: "delete", serialized: (obj as unknown as { toObject(): object }).toObject(), wasGif: isGif });
        fc.remove(obj);
        fc.discardActiveObject();
        fc.requestRenderAll();
        if (entry.objectId) {
          fetch(`/api/board-objects?boardId=${BOARD_ID}&objectId=${encodeURIComponent(entry.objectId)}`, { method: "DELETE" })
            .then(() => broadcastRef.current?.({ type: "OBJECT_DELETED", objectId: entry.objectId }))
            .catch(console.error);
        }
        if (isGif) {
          gifCountRef.current = Math.max(0, gifCountRef.current - 1);
          if (gifCountRef.current === 0) stopRef.current();
        }
      }

    } else if (entry.type === "modify") {
      const obj = fc.getObjects().find(
        o => (o as unknown as { boardObjectId?: string }).boardObjectId === entry.objectId
      );
      if (obj) {
        const before = (obj as unknown as { toObject(): object }).toObject();
        undoStack.current.push({ type: "modify", objectId: entry.objectId, before });
        obj.set(entry.after as Parameters<typeof obj.set>[0]);
        obj.setCoords();
        fc.requestRenderAll();
        saveRef.current(obj as unknown as SaveableObj);
      }
    }

    isUndoingRef.current = false;
  }).current;

  return { pushUndo, executeUndo, executeRedo, isUndoingRef };
}
