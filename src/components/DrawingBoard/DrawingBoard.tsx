"use client";

import { useRef, useState, useEffect } from "react";
import type { Canvas } from "fabric";
import Toolbar from "./components/Toolbar";
import TextToolbar from "./components/TextToolbar";
import BoardHeader from "./components/BoardHeader";
import DrawingTools from "./components/DrawingTools";
import RemoteCursors from "./components/RemoteCursors";
import { useGifLoop } from "./hooks/useGifLoop";
import { useBoardSync } from "./hooks/useBoardSync";
import { useFabricCanvas } from "./hooks/useFabricCanvas";
import { useCanvasActions } from "./hooks/useCanvasActions";
import type { Tool, TextProps } from "./types";
import { DEFAULT_TEXT_PROPS } from "./types";
import { BG_COLOR, getOrCreateUser, CURSOR_COLORS } from "./constants";
import {
  RoomProvider as LiveblocksRoomProvider,
  useBroadcastEvent,
  useEventListener,
  useMyPresence,
  useSelf,
} from "@/liveblocks.config";

// React 19 / Liveblocks JSX compat shim — remove once Liveblocks ships React 19 types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RoomProvider = LiveblocksRoomProvider as any;

// ── Inner board — uses Liveblocks hooks (must be inside RoomProvider) ─────
function DrawingBoardInner() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef   = useRef<Canvas | null>(null);

  const [tool, setTool]                   = useState<Tool>("select");
  const [color, setColor]                 = useState("#000000");
  const [brushSize, setBrushSize]         = useState(5);
  const [isSyncing, setIsSyncing]         = useState(false);
  const [zoom, setZoom]                   = useState(1);
  const [vpt, setVpt]                     = useState<number[]>([1, 0, 0, 1, 0, 0]);
  const [hasSelection, setHasSelection]   = useState(false);
  const [selectedIsText, setSelectedIsText] = useState(false);
  const [textProps, setTextProps]         = useState<TextProps>(DEFAULT_TEXT_PROPS);

  // Keep refs in sync so async canvas callbacks always read the latest values
  const toolRef      = useRef<Tool>("select");
  const colorRef     = useRef("#000000");
  const brushSizeRef = useRef(5);
  toolRef.current      = tool;
  colorRef.current     = color;
  brushSizeRef.current = brushSize;

  // ── Liveblocks ────────────────────────────────────────────────────────
  const broadcastEvent               = useBroadcastEvent();
  const [, updateMyPresence]         = useMyPresence();
  const self                         = useSelf();

  // Derive cursor color from connectionId so no two live sessions share a color.
  // connectionId is a unique integer assigned by Liveblocks per connection.
  useEffect(() => {
    if (self?.connectionId == null) return;
    const color = CURSOR_COLORS[self.connectionId % CURSOR_COLORS.length];
    updateMyPresence({ color });
  }, [self?.connectionId, updateMyPresence]);

  const { gifCountRef, startGifLoop, stopGifLoop } = useGifLoop(fabricRef);

  const { saveObject } = useBoardSync({ broadcast: broadcastEvent });

  const { modsRef } = useFabricCanvas({
    canvasElRef,
    fabricRef,
    colorRef,
    brushSizeRef,
    toolRef,
    saveObject,
    startGifLoop,
    stopGifLoop,
    gifCountRef,
    setTool,
    setZoom,
    setVpt,
    setHasSelection,
    setSelectedIsText,
    setTextProps,
    setIsSyncing,
    broadcast: broadcastEvent,
  });

  const { addText, addShape, addGif, recolorSelected, zoomIn, zoomOut, applyTextProp } =
    useCanvasActions({
      fabricRef,
      modsRef,
      colorRef,
      brushSizeRef,
      tool,
      color,
      brushSize,
      saveObject,
      startGifLoop,
      stopGifLoop,
      gifCountRef,
      setTool,
      setZoom,
      setVpt,
      setTextProps,
      broadcast: broadcastEvent,
    });

  // ── Apply remote canvas events from other users ───────────────────────
  useEventListener(({ event }) => {
    const fc   = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    if (event.type === "CANVAS_CLEARED") {
      fc.clear();
      fc.backgroundColor = BG_COLOR;
      fc.renderAll();
      gifCountRef.current = 0;
      stopGifLoop();
      return;
    }

    if (event.type === "OBJECT_DELETED") {
      const obj = fc.getObjects().find(
        (o) => (o as unknown as Record<string, unknown>).boardObjectId === event.objectId,
      );
      if (obj) { fc.remove(obj); fc.requestRenderAll(); }
      return;
    }

    if (event.type === "OBJECT_UPSERTED") {
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(event.fabricJSON); } catch { return; }
      // Skip GIF placeholders — they can't be re-instantiated without the buffer
      const BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
      if (parsed.giphyId || parsed.src === BLANK_GIF) return;

      mods.util.enlivenObjects([parsed])
        .then((objects) => {
          const liveObj = (objects as unknown[])[0];
          if (!liveObj) return;
          const existing = fc.getObjects().find(
            (o) => (o as unknown as Record<string, unknown>).boardObjectId === event.objectId,
          );
          if (existing) fc.remove(existing);
          (liveObj as Record<string, unknown>).boardObjectId = event.objectId;
          fc.add(liveObj as Parameters<typeof fc.add>[0]);
          fc.requestRenderAll();
        })
        .catch(console.error);
    }
  });

  // ── Track local cursor — broadcast in world coordinates ─────────────
  // Use a window-level listener so Fabric's canvas event interception
  // doesn't swallow the events before React sees them.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const fc = fabricRef.current;
      if (!fc) return;
      const v = fc.viewportTransform as number[];
      // Convert screen → canvas world space
      updateMyPresence({ cursor: {
        x: (e.clientX - v[4]) / v[0],
        y: (e.clientY - v[5]) / v[3],
      }});
    };
    const onLeave = () => updateMyPresence({ cursor: null });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [updateMyPresence, fabricRef]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ overscrollBehavior: "none" }}
    >
      <canvas ref={canvasElRef} className="absolute inset-0 touch-none" />

      {/* Other users' cursors */}
      <RemoteCursors vpt={vpt} />

      {/* Text-specific toolbar */}
      {selectedIsText && (
        <TextToolbar
          textProps={textProps}
          color={color}
          onColorChange={(c) => { setColor(c); recolorSelected(c); }}
          onApply={applyTextProp}
        />
      )}

      {/* Regular toolbar — drawing tools or non-text selections */}
      {!selectedIsText && (hasSelection || tool === "pencil" || tool === "brush") && (
        <Toolbar
          tool={tool}
          color={color}
          brushSize={brushSize}
          zoom={zoom}
          onColorChange={setColor}
          onBrushSizeChange={setBrushSize}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onRecolorSelected={recolorSelected}
        />
      )}
      <DrawingTools
        tool={tool}
        color={color}
        onToolChange={setTool}
        onAddShape={addShape}
        onAddText={addText}
        onAddGif={addGif}
      />
      <BoardHeader isSyncing={isSyncing} />
    </div>
  );
}

// ── Outer wrapper — provides the Liveblocks room ──────────────────────────
export default function DrawingBoard() {
  const [user] = useState(getOrCreateUser);
  return (
    <RoomProvider
      id="main-board"
      initialPresence={{ cursor: null, name: user.name, color: CURSOR_COLORS[0] }}
    >
      <DrawingBoardInner />
    </RoomProvider>
  );
}

