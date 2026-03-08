"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { Canvas } from "fabric";
import Toolbar from "./components/Toolbar";
import TextToolbar from "./components/TextToolbar";
import BoardHeader from "./components/BoardHeader";
import DrawingTools from "./components/DrawingTools";
import RemoteCursors from "./components/RemoteCursors";
import ZoomNav from "./components/ZoomNav";
import ActiveUsers from "./components/ActiveUsers";
import ObjectLockButton from "./components/ObjectLockButton";
import ColorPopover from "./components/ColorPopover";
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
  useErrorListener,
  useStatus,
  useMyPresence,
  useSelf,
} from "@/liveblocks.config";

// React 19 / Liveblocks JSX compat shim — remove once Liveblocks ships React 19 types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RoomProvider = LiveblocksRoomProvider as any;

// ── Capacity wall — shown when max participants already in the room ────────
function CapacityWall() {
  const status = useStatus();
  const [blocked, setBlocked] = useState(false);

  useErrorListener((err) => {
    // Liveblocks error codes 4xxx = connection rejected; 4005 = room full
    const code = (err as unknown as { code?: number }).code ?? 0;
    if (code >= 4000 && code < 5000) setBlocked(true);
  });

  // Also treat a hard-disconnected status (after initial connection never succeeded)
  // as a capacity issue so we surface *something* rather than a silent blank screen.
  const wasNeverConnected = status === "disconnected";

  if (!blocked && !wasNeverConnected) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", background: "rgba(255,255,255,0.35)" }}
    >
      <div className="bg-white/90 rounded-3xl shadow-2xl px-10 py-10 max-w-sm w-full mx-4 text-center flex flex-col items-center gap-4">
        <span className="text-4xl select-none">🚫</span>
        <h2 className="text-xl font-semibold tracking-tight text-gray-900 leading-snug">
          The board is full right now
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          There are too many people online at the moment.{" "}
          Please check back in a little while — a spot should open up soon!
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-6 py-2.5 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-800 active:scale-95 transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ── Shared color popover slot type — one instance managed by the board ───────
type ColorSlot = "toolbar-fill" | "toolbar-stroke" | "text";

// ── Inner board — uses Liveblocks hooks (must be inside RoomProvider) ─────
function DrawingBoardInner() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef   = useRef<Canvas | null>(null);

  const [tool, setTool]                         = useState<Tool>("select");
  const [color, setColor]                       = useState("#000000");
  const [brushSize, setBrushSize]               = useState(5);
  const [isSyncing, setIsSyncing]               = useState(false);
  const [zoom, setZoom]                         = useState(1);
  const [vpt, setVpt]                           = useState<number[]>([1, 0, 0, 1, 0, 0]);
  const [hasSelection, setHasSelection]         = useState(false);
  const [selectedIsText, setSelectedIsText]     = useState(false);
  const [selectedIsGif, setSelectedIsGif]       = useState(false);
  const [selectedIsPath, setSelectedIsPath]     = useState(false);
  const [selectedIsLocked, setSelectedIsLocked] = useState(false);
  const [shapeStrokeColor, setShapeStrokeColor] = useState("#000000");
  const [opacity, setOpacity]                   = useState(1);
  const [textProps, setTextProps]               = useState<TextProps>(DEFAULT_TEXT_PROPS);

  // Whenever any component opens a popover, we increment the other two signals
  // so they close themselves — guaranteeing only one popover is ever visible.
  const [drawingToolsClose, setDrawingToolsClose] = useState(0);
  const [toolbarClose, setToolbarClose]           = useState(0);
  const [textToolbarClose, setTextToolbarClose]   = useState(0);

  // Shared singleton color popover — lifted here so only one instance ever exists.
  const [colorPopoverSlot, setColorPopoverSlot] = useState<ColorSlot | null>(null);
  const closeColorPopover = useCallback(() => setColorPopoverSlot(null), []);
  const openColorPopover  = useCallback((slot: ColorSlot) => {
    setColorPopoverSlot(slot);
    if (slot === "text") {
      setDrawingToolsClose(n => n + 1);
      setToolbarClose(n => n + 1);
    } else {
      setDrawingToolsClose(n => n + 1);
      setTextToolbarClose(n => n + 1);
    }
  }, []);

  const onDrawingToolsPopoverOpened = () => { setToolbarClose(n => n + 1); setTextToolbarClose(n => n + 1); setColorPopoverSlot(null); };
  const onToolbarPopoverOpened      = () => { setDrawingToolsClose(n => n + 1); setTextToolbarClose(n => n + 1); setColorPopoverSlot(null); };
  const onTextToolbarPopoverOpened  = () => { setDrawingToolsClose(n => n + 1); setToolbarClose(n => n + 1); setColorPopoverSlot(null); };

  const selectedIsShape = hasSelection && !selectedIsText && !selectedIsGif && !selectedIsPath;

  // Keep refs in sync so async canvas callbacks always read the latest values
  const toolRef      = useRef<Tool>("select");
  const colorRef     = useRef("#000000");
  const brushSizeRef = useRef(5);
  const opacityRef   = useRef(1);
  toolRef.current      = tool;
  colorRef.current     = color;
  brushSizeRef.current = brushSize;
  opacityRef.current   = opacity;

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
    setSelectedIsGif,
    setSelectedIsPath,
    setSelectedIsLocked,
    setShapeStrokeColor,
    setColor,
    setBrushSize,
    setOpacity,
    opacityRef,
    setTextProps,
    setIsSyncing,
    broadcast: broadcastEvent,
  });

  const { addText, addShape, addGif, recolorSelected, restrokeSelected, reweightSelected, reOpacitySelected, lockSelected, zoomIn, zoomOut, zoomReset, applyTextProp } =
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

  // ── Apply remote canvas events from other users ───────────────────
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

    if (event.type === "LAYER_REORDERED") {
      const allObjs = fc.getObjects();
      event.order.forEach((oid, targetIdx) => {
        if (!oid) return;
        const obj = allObjs.find(o => (o as unknown as Record<string, unknown>).boardObjectId === oid);
        if (obj) fc.moveObjectTo(obj, targetIdx);
      });
      fc.requestRenderAll();
      return;
    }

    if (event.type === "OBJECT_UPSERTED") {
      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(event.fabricJSON); } catch { return; }
      // Skip GIF placeholders — they can't be re-instantiated without the buffer
      const BLANK_GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
      // Never persist temporary Fabric multi-selection groups to other canvases
      if (parsed.giphyId || parsed.src === BLANK_GIF || parsed.type === "activeselection") return;

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
          onApply={applyTextProp}
          closeSignal={textToolbarClose}
          onPopoverOpened={onTextToolbarPopoverOpened}
          colorPopoverOpen={colorPopoverSlot === "text"}
          onOpenColorPopover={() => openColorPopover("text")}
          onCloseColorPopover={closeColorPopover}
        />
      )}

      {/* Stroke/fill toolbar — active pencil/brush or any non-text, non-gif selection */}
      {!selectedIsText && !selectedIsGif && (tool === "pencil" || tool === "brush" || hasSelection) && (
        <Toolbar
          color={color}
          opacity={opacity}
          strokeWeight={brushSize}
          onOpacityChange={(v) => { setOpacity(v); if (hasSelection) reOpacitySelected(v); }}
          onStrokeWeightChange={(v) => { setBrushSize(v); if (hasSelection) reweightSelected(v); }}
          strokeColor={selectedIsShape ? shapeStrokeColor : undefined}
          onStrokeColorChange={selectedIsShape ? (c) => { setShapeStrokeColor(c); restrokeSelected(c); } : undefined}
          closeSignal={toolbarClose}
          onPopoverOpened={onToolbarPopoverOpened}
          colorPopoverOpenFor={colorPopoverSlot === "toolbar-fill" ? "fill" : colorPopoverSlot === "toolbar-stroke" ? "stroke" : null}
          onOpenFillColorPopover={() => openColorPopover("toolbar-fill")}
          onOpenStrokeColorPopover={() => openColorPopover("toolbar-stroke")}
          onCloseColorPopover={closeColorPopover}
        />
      )}
      <DrawingTools
        tool={tool}
        color={color}
        onToolChange={setTool}
        onAddShape={addShape}
        onAddText={addText}
        onAddGif={addGif}
        closeSignal={drawingToolsClose}
        onPopoverOpened={onDrawingToolsPopoverOpened}
      />
      <ZoomNav zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onZoomReset={zoomReset} onUndo={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, metaKey: true, bubbles: true }))} />
      <BoardHeader isSyncing={isSyncing} />
      <ActiveUsers />
      {/* Lock/unlock button floats above the selected object — self-positions via RAF */}
      {hasSelection && (
        <ObjectLockButton
          fabricRef={fabricRef}
          locked={selectedIsLocked}
          onToggle={() => {
            const next = !selectedIsLocked;
            setSelectedIsLocked(next);
            lockSelected(next);
          }}
        />
      )}
      <CapacityWall />

      {/* ── Shared singleton color popover — renders at the top, next to navigation ── */}
      {colorPopoverSlot === "toolbar-fill" && (
        <ColorPopover
          color={color}
          fabricRef={fabricRef}
          onColorChange={(c) => { setColor(c); if (hasSelection) recolorSelected(c); }}
          onClose={closeColorPopover}
          anchorStyle={{ top: "auto", bottom: 100, left: "calc(50vw - 140px)" }}
        />
      )}
      {colorPopoverSlot === "toolbar-stroke" && (
        <ColorPopover
          color={shapeStrokeColor}
          fabricRef={fabricRef}
          onColorChange={(c) => { setShapeStrokeColor(c); restrokeSelected(c); }}
          onClose={closeColorPopover}
          anchorStyle={{ top: "auto", bottom: 100, left: "calc(50vw - 140px)" }}
        />
      )}
      {colorPopoverSlot === "text" && (
        <ColorPopover
          color={color}
          gradient={textProps.gradient}
          fabricRef={fabricRef}
          onColorChange={(c) => { setColor(c); recolorSelected(c); }}
          onGradientChange={(g) => applyTextProp({ gradient: g })}
          onClose={closeColorPopover}
        />
      )}
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

