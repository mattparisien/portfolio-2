import { useEffect, useRef } from "react";
import type { IText, Textbox, Canvas } from "fabric";
import type { FabricMods, Tool } from "../types";
import { BOARD_ID } from "../constants";
import type { SaveableObj } from "./useBoardSync";
import type { RoomEvent } from "@/liveblocks.config";

interface UseKeyboardShortcutsOptions {
  fabricRef:    React.MutableRefObject<Canvas | null>;
  modsRef:      React.MutableRefObject<FabricMods | null>;
  toolRef:      React.MutableRefObject<Tool>;
  colorRef:     React.MutableRefObject<string>;
  brushSizeRef: React.MutableRefObject<number>;
  /** Ref that tracks whether a text object is currently pending/editing. */
  pendingTextRef: React.MutableRefObject<IText | Textbox | null>;
  /** Ref for deferred multi-object saves — set to null on delete. */
  pendingMultiSaveRef: React.MutableRefObject<SaveableObj[] | null>;
  executeUndo:  () => void;
  executeRedo:  () => void;
  copy:         () => void;
  paste:        () => void;
  pushUndo:     (entry: { type: "delete"; serialized: object; wasGif: boolean }) => void;
  saveObject:   (obj: SaveableObj) => void;
  broadcast?:   (event: RoomEvent) => void;
  setTool:      (t: Tool) => void;
  gifCountRef:  React.MutableRefObject<number>;
  videoCountRef?: React.MutableRefObject<number>;
  stopGifLoop:  () => void;
}

/**
 * Registers window keydown (+ mousemove for cursor tracking) and handles:
 *   Cmd/Ctrl+C   → copy
 *   Cmd/Ctrl+V   → paste
 *   Cmd/Ctrl+Z   → undo
 *   Cmd/Ctrl+⇧Z  → redo
 *   V            → select tool
 *   T            → insert text at cursor
 *   [ / ]        → layer order (send to back / bring to front)
 *   Delete/⌫    → delete selection
 */
export function useKeyboardShortcuts({
  fabricRef,
  modsRef,
  toolRef,
  colorRef,
  brushSizeRef,
  pendingTextRef,
  pendingMultiSaveRef,
  executeUndo,
  executeRedo,
  copy,
  paste,
  pushUndo,
  saveObject,
  broadcast,
  setTool,
  gifCountRef,
  videoCountRef,
  stopGifLoop,
}: UseKeyboardShortcutsOptions): void {
  // Always-current refs for callbacks that may change identity.
  const execUndoRef  = useRef(executeUndo);
  const execRedoRef  = useRef(executeRedo);
  const copyRef      = useRef(copy);
  const pasteRef     = useRef(paste);
  const pushUndoRef  = useRef(pushUndo);
  const saveRef      = useRef(saveObject);
  const broadcastRef = useRef(broadcast);
  const setToolRef   = useRef(setTool);
  const stopRef      = useRef(stopGifLoop);
  execUndoRef.current  = executeUndo;
  execRedoRef.current  = executeRedo;
  copyRef.current      = copy;
  pasteRef.current     = paste;
  pushUndoRef.current  = pushUndo;
  saveRef.current      = saveObject;
  broadcastRef.current = broadcast;
  setToolRef.current   = setTool;
  stopRef.current      = stopGifLoop;

  useEffect(() => {
    // Track latest mouse position for 'T' text placement.
    const lastMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const trackMouse = (e: MouseEvent) => { lastMouse.x = e.clientX; lastMouse.y = e.clientY; };
    window.addEventListener("mousemove", trackMouse);

    const handleKeyDown = (e: KeyboardEvent) => {
      const fc   = fabricRef.current;
      const mods = modsRef.current;
      if (!fc) return;

      const isMod        = e.metaKey || e.ctrlKey;
      const active       = fc.getActiveObject();
      const isEditingText = !!(active as { isEditing?: boolean } | null)?.isEditing;

      // ── Copy / Paste ──────────────────────────────────────────────────
      if (isMod && e.key === "c") {
        if (!active || isEditingText) return;
        e.preventDefault();
        copyRef.current();
        return;
      }
      if (isMod && e.key === "v") {
        if (isEditingText) return;
        e.preventDefault();
        pasteRef.current();
        return;
      }

      // ── Undo / Redo ───────────────────────────────────────────────────
      if (isMod && !e.shiftKey && e.key === "z") {
        if (isEditingText) return;
        e.preventDefault();
        execUndoRef.current();
        return;
      }
      if (isMod && e.shiftKey && (e.key === "z" || e.key === "Z")) {
        if (isEditingText) return;
        e.preventDefault();
        execRedoRef.current();
        return;
      }

      // ── Select tool (V) ───────────────────────────────────────────────
      if (e.key === "v" || e.key === "V") {
        if (isEditingText) return;
        e.preventDefault();
        setToolRef.current("select");
        return;
      }

      // ── Insert text at cursor (T) ─────────────────────────────────────
      if (e.key === "t" || e.key === "T") {
        if (isEditingText || !mods) return;
        e.preventDefault();
        const vpt = fc.viewportTransform as number[];
        const cx  = (lastMouse.x - vpt[4]) / vpt[0];
        const cy  = (lastMouse.y - vpt[5]) / vpt[3];
        const txt = new mods.IText("Type something", {
          left: cx, top: cy,
          originX: "center", originY: "center",
          fontSize:   Math.max(brushSizeRef.current * 2, 24),
          fill:       colorRef.current,
          fontFamily: "sans-serif",
          editable:   true,
        });
        fc.add(txt);
        fc.setActiveObject(txt);
        pendingTextRef.current = txt;
        fc.requestRenderAll();
        requestAnimationFrame(() => {
          txt.enterEditing();
          txt.selectAll();
          fc.requestRenderAll();
        });
        return;
      }

      // All remaining shortcuts require an active (non-editing) object.
      if (!active || isEditingText) return;

      // ── Layer order: [ = send to back, ] = bring to front ─────────────
      if (e.key === "[" || e.key === "]") {
        e.preventDefault();
        const objects = fc.getObjects();
        if (e.key === "]") fc.moveObjectTo(active, objects.length - 1);
        else               fc.moveObjectTo(active, 0);
        fc.requestRenderAll();
        const allObjs = fc.getObjects();
        allObjs.forEach((obj, i) => {
          (obj as unknown as SaveableObj).zIndex = i;
          if ((obj as unknown as { boardObjectId?: string }).boardObjectId) {
            saveRef.current(obj as unknown as SaveableObj);
          }
        });
        broadcastRef.current?.({
          type: "LAYER_REORDERED",
          order: allObjs.map(o => (o as unknown as { boardObjectId?: string }).boardObjectId ?? ""),
        });
        return;
      }

      // ── Delete / Backspace ─────────────────────────────────────────────
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      e.preventDefault();
      pendingMultiSaveRef.current = null;

      const members = fc.getActiveObjects()
        .filter(o => !(o as unknown as { lockMovementX?: boolean }).lockMovementX)
        .slice() as unknown as SaveableObj[];

      fc.discardActiveObject();
      members.forEach(obj => {
        const isGif = !!(obj as { giphyId?: string }).giphyId;
        pushUndoRef.current({
          type:       "delete",
          serialized: (obj as unknown as { toObject(): object }).toObject(),
          wasGif:     isGif,
        });
        fc.remove(obj as unknown as Parameters<typeof fc.remove>[0]);

        const oid = (obj as { boardObjectId?: string }).boardObjectId;
        if (oid) {
          fetch(`/api/board-objects?boardId=${BOARD_ID}&objectId=${encodeURIComponent(oid)}`, { method: "DELETE" })
            .then(() => broadcastRef.current?.({ type: "OBJECT_DELETED", objectId: oid }))
            .catch(console.error);
        }
        if (isGif) {
          gifCountRef.current = Math.max(0, gifCountRef.current - 1);
          stopRef.current();
        }
        if ((obj as Record<string, unknown>)._isVideo) {
          const vid = (obj as Record<string, unknown>)._videoEl as HTMLVideoElement | undefined;
          vid?.pause();
          if (videoCountRef) videoCountRef.current = Math.max(0, videoCountRef.current - 1);
          stopRef.current();
        }
      });
      fc.requestRenderAll();
    };

    window.addEventListener("keydown",    handleKeyDown);

    return () => {
      window.removeEventListener("mousemove",   trackMouse);
      window.removeEventListener("keydown",     handleKeyDown);
    };
  // Intentionally empty — all callbacks accessed via latest-value refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
