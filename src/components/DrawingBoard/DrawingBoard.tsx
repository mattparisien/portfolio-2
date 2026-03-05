"use client";

import { useRef, useState, useCallback } from "react";
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
import { BG_COLOR } from "./constants";
import {
  RoomProvider as LiveblocksRoomProvider,
  useBroadcastEvent,
  useEventListener,
  useMyPresence,
} from "@/liveblocks.config";

// React 19 / Liveblocks JSX compat shim — remove once Liveblocks ships React 19 types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RoomProvider = LiveblocksRoomProvider as any;

// ── Per-session user identity ─────────────────────────────────────────────
const CURSOR_COLORS = [
  "#E63946", "#2A9D8F", "#E9C46A", "#F4A261", "#A8DADC",
  "#6A4C93", "#1982C4", "#8AC926", "#FF595E", "#6A0572",
];
const ADJECTIVES = ["Cosmic", "Sleepy", "Bouncy", "Fuzzy", "Glitchy", "Sneaky", "Turbo", "Neon", "Silent", "Wobbly"];
const ANIMALS    = ["Panda", "Walrus", "Ferret", "Gecko", "Narwhal", "Capybara", "Axolotl", "Quokka", "Lemur", "Tapir"];

function getOrCreateUser(): { name: string; color: string } {
  if (typeof window === "undefined") return { name: "User", color: CURSOR_COLORS[0] };
  const stored = sessionStorage.getItem("lb_user");
  if (stored) return JSON.parse(stored);
  const name  = `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${ANIMALS[Math.floor(Math.random() * ANIMALS.length)]}`;
  const color = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
  const user  = { name, color };
  sessionStorage.setItem("lb_user", JSON.stringify(user));
  return user;
}

// ── Inner board — uses Liveblocks hooks (must be inside RoomProvider) ─────
function DrawingBoardInner() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef   = useRef<Canvas | null>(null);

  const [tool, setTool]                   = useState<Tool>("select");
  const [color, setColor]                 = useState("#000000");
  const [brushSize, setBrushSize]         = useState(5);
  const [isSyncing, setIsSyncing]         = useState(false);
  const [zoom, setZoom]                   = useState(1);
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

  // ── Track local cursor for other users to see ─────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    updateMyPresence({ cursor: { x: e.clientX, y: e.clientY } });
  }, [updateMyPresence]);

  const handleMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ overscrollBehavior: "none" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasElRef} className="absolute inset-0 touch-none" />

      {/* Other users' cursors */}
      <RemoteCursors />

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
      initialPresence={{ cursor: null, name: user.name, color: user.color }}
    >
      <DrawingBoardInner />
    </RoomProvider>
  );
}

