"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { Canvas } from "fabric";
import PropertiesPanel from "./components/PropertiesPanel";
import BoardHeader from "./components/BoardHeader";
import Toolbar from "./components/Toolbar/Toolbar";
import RemoteCursors from "./components/RemoteCursors";
// import ZoomNav from "./components/ZoomNav";
// import ActiveUsers from "./components/ActiveUsers";
import ObjectLockButton from "./components/ObjectLockButton";
import ColorPopover from "./components/ColorPopover";
import { useGifLoop } from "./hooks/useGifLoop";
import { useBoardSync } from "./hooks/useBoardSync";
import { useFabricCanvas } from "./hooks/useFabricCanvas";
import { useCanvasActions } from "./hooks/useCanvasActions";
import type { Tool, TextProps, ShapeType, TextGradient } from "./types";
import { DEFAULT_TEXT_PROPS } from "./types";
import { getOrCreateUser, CURSOR_COLORS } from "./constants";
import { getCanvasBgColor } from "./canvasUtils";
import { usePenTool } from "./hooks/usePenTool";
import { useWindowWidth } from "@/app/hooks/useWindowWidth";
import { CursorArrowIcon, PencilCursorIcon } from "./components/Icons";
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
function DrawingBoardInner({ initialObjects }: { initialObjects: { fabricJSON: string }[] }) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef   = useRef<Canvas | null>(null);

  const [tool, setTool]                         = useState<Tool>("select");
  const [color, setColor]                       = useState("#000000");
  const [brushSize, setBrushSize]               = useState(1);
  const [isSyncing, setIsSyncing]               = useState(false);
  const [zoom, setZoom]                         = useState(1);
  const [vpt, setVpt]                           = useState<number[]>([1, 0, 0, 1, 0, 0]);
  const [hasSelection, setHasSelection]         = useState(false);
  const [selectedIsText, setSelectedIsText]     = useState(false);
  const [selectedIsGif, setSelectedIsGif]       = useState(false);
  const [selectedIsPath, setSelectedIsPath]     = useState(false);
  const [selectedIsLine, setSelectedIsLine]     = useState(false);
  const [selectedIsLocked, setSelectedIsLocked] = useState(false);
  const [shapeStrokeColor, setShapeStrokeColor] = useState("#000000");
  const [opacity, setOpacity]                   = useState(1);
  const [textProps, setTextProps]               = useState<TextProps>(DEFAULT_TEXT_PROPS);
  const [shapeType, setShapeType]               = useState<ShapeType>("rect");
  const [fillGradient, setFillGradient]         = useState<TextGradient | null>(null);

  // Clear confirm dialog
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  // Blank-canvas guidance
  const [canvasEmpty, setCanvasEmpty]           = useState(true);
  // Mobile warning banner
  const [mobileWarnDismissed, setMobileWarnDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("crumb-mobile-warn-dismissed") === "1";
  });

  // Whenever any component opens a popover, we increment the other two signals
  // so they close themselves — guaranteeing only one popover is ever visible.
  const [drawingToolsClose, setDrawingToolsClose] = useState(0);
  const [uploadSignal, setUploadSignal]           = useState(0);

  // Shared singleton color popover — lifted here so only one instance ever exists.
  const [localCursor, setLocalCursor] = useState<{ x: number; y: number } | null>({ x: -999, y: -999 });
  const [cursorOnScreen, setCursorOnScreen] = useState(false);
  const [isOverUI, setIsOverUI]       = useState(false);
  const [isOverHandle, setIsOverHandle] = useState(false);

  const [colorPopoverSlot, setColorPopoverSlot] = useState<ColorSlot | null>(null);
  const closeColorPopover = useCallback(() => setColorPopoverSlot(null), []);
  const openColorPopover  = useCallback((slot: ColorSlot) => {
    setColorPopoverSlot(slot);
    setDrawingToolsClose(n => n + 1);
  }, []);

  const onDrawingToolsPopoverOpened = () => { setColorPopoverSlot(null); };

  // ── Per-tool defaults ─────────────────────────────────────────────────
  // Wraps setTool so that switching tools resets brushSize / stroke color
  // to sensible defaults for each tool category.
  const changeTool = useCallback((t: Tool) => {
    setTool(t);
    if (t === "shape") {
      setBrushSize(0);
      setShapeStrokeColor("#000000");
    } else if (t === "pencil" || t === "brush" || t === "line") {
      setBrushSize(1);
    }
  }, []);

  const selectedIsShape = hasSelection && !selectedIsText && !selectedIsGif && !selectedIsPath && !selectedIsLine;
  const panelVisible    = selectedIsText || (!selectedIsGif && (tool === "pencil" || tool === "brush" || hasSelection));

  // Mobile detection
  const windowWidth   = useWindowWidth();
  const isMobile      = windowWidth > 0 && windowWidth < 768;
  const showMobileWarn = isMobile && !mobileWarnDismissed;

  const penOverlayRef    = useRef<HTMLCanvasElement>(null);

  // Keep refs in sync so async canvas callbacks always read the latest values
  const toolRef               = useRef<Tool>("select");
  const colorRef              = useRef("#000000");
  const brushSizeRef          = useRef(1);
  const opacityRef            = useRef(1);
  const shapeTypeRef          = useRef<ShapeType>("rect");
  const fillGradientRef       = useRef<TextGradient | null>(null);
  const shapeStrokeColorRef   = useRef("#000000");
  toolRef.current               = tool;
  colorRef.current              = color;
  brushSizeRef.current          = brushSize;
  opacityRef.current            = opacity;
  shapeTypeRef.current          = shapeType;
  fillGradientRef.current       = fillGradient;
  shapeStrokeColorRef.current   = shapeStrokeColor;

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

  const { modsRef, undoFnRef, redoFnRef, deleteFnRef } = useFabricCanvas({
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
    setSelectedIsLine,
    setSelectedIsLocked,
    setShapeStrokeColor,
    setColor,
    setBrushSize,
    setOpacity,
    opacityRef,
    setTextProps,
    setIsSyncing,
    broadcast: broadcastEvent,
    shapeTypeRef,
    fillGradientRef,
    shapeStrokeColorRef,
    setIsOverHandle,
    setCanvasEmpty,
    initialObjects,
  });

  const { addText, addGif, addImage, recolorSelected, restrokeSelected, reweightSelected, reOpacitySelected, lockSelected, zoomIn, zoomOut, zoomReset, applyTextProp, applyFillGradient, clearCanvas } =
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
      fillGradientRef,
      shapeStrokeColorRef,
    });

  usePenTool({
    overlayRef:   penOverlayRef,
    fabricRef,
    modsRef,
    active:       tool === "brush",
    colorRef,
    brushSizeRef,
    opacityRef,
    saveObject,
    setTool,
  });

  const activateShapeTool = useCallback((st: ShapeType) => {
    setShapeType(st);
    setTool("shape");
    setBrushSize(0);
    setShapeStrokeColor("#000000");
  }, []);

  // ── Global keyboard shortcuts for tool switching / actions ────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const isMod = e.metaKey || e.ctrlKey;
      // Shift+P → pencil
      if (e.shiftKey && !isMod && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        changeTool("pencil");
        return;
      }
      // O → circle
      if (!e.shiftKey && !isMod && (e.key === "o" || e.key === "O")) {
        e.preventDefault();
        activateShapeTool("circle");
        return;
      }
      // R → rectangle
      if (!e.shiftKey && !isMod && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        activateShapeTool("rect");
        return;
      }
      // Shift+Cmd/Ctrl+K → open upload dialog
      if (e.shiftKey && isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setUploadSignal(n => n + 1);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activateShapeTool, setTool, changeTool]);

  // ── Apply remote canvas events from other users ───────────────────
  useEventListener(({ event }) => {
    const fc   = fabricRef.current;
    const mods = modsRef.current;
    if (!fc || !mods) return;

    if (event.type === "CANVAS_CLEARED") {
      fc.clear();
      fc.backgroundColor = getCanvasBgColor();
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
      setLocalCursor({ x: e.clientX, y: e.clientY });
      setCursorOnScreen(true);
    };
    const onLeave = () => { updateMyPresence({ cursor: null }); setCursorOnScreen(false); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [updateMyPresence, fabricRef]);

  return (
    <div
      className={`fixed inset-0 overflow-hidden ${tool === "pencil" || tool === "select" ? "board-no-cursor" : ""}`}
      style={{
        overscrollBehavior: "none",
        cursor: tool === "eraser" ? "crosshair"
          : tool === "text" ? "text"
          : tool === "line" || tool === "shape" ? "crosshair"
          : undefined,
      }}
      onPointerOver={(e) => {
        // Show arrow cursor when over any UI overlay (not the canvas itself)
        const target = e.target as HTMLElement;
        setIsOverUI(!!(target.closest(".drawing-ui-overlay") || target.closest("button") || target.closest("[role=dialog]")));
      }}
    >
      <canvas ref={canvasElRef} className="absolute inset-0 touch-none" />
      {/* Pen tool overlay — renders anchor points and bezier preview */}
      <canvas ref={penOverlayRef} className="absolute inset-0 pointer-events-none" />

      {/* Other users' cursors */}
      <RemoteCursors vpt={vpt} />

      {/* Local cursor — only show custom SVG for pencil (pen tool uses native crosshair) */}
      {cursorOnScreen && !isOverUI && !isOverHandle && tool === "pencil" && (
        <div
          className="pointer-events-none fixed z-[9999]"
          style={{ left: 0, top: 0, transform: `translate(${localCursor!.x}px, ${localCursor!.y}px)`, willChange: "transform" }}
        >
          <PencilCursorIcon />
        </div>
      )}

      {/* Default arrow cursor for select / unhandled tools */}
      {cursorOnScreen && !isOverUI && !isOverHandle && tool === "select" && (
        <div
          className="pointer-events-none fixed z-[9999]"
          style={{ left: 0, top: 0, transform: `translate(${localCursor!.x}px, ${localCursor!.y}px)`, willChange: "transform", color: "#1a1a1a" }}
        >
          <CursorArrowIcon pathClassName="fill-current stroke-20 stroke-white" svgClassName="block" />
        </div>
      )}

      {/* ── Blank canvas guidance ─────────────────────────────────────────── */}
      {canvasEmpty && (
        <div
          className="pointer-events-none fixed inset-0 flex items-center justify-center z-[50]"
          style={{ opacity: 0.12 }}
        >
          <p className="text-3xl font-medium text-gray-900 select-none text-center px-8">
            Start drawing — pick a tool below
          </p>
        </div>
      )}

      {/* Properties panel — slides in from the right when a drawing tool is active or an object is selected */}
      {panelVisible && (
        <PropertiesPanel
          tool={tool}
          hasSelection={hasSelection}
          selectedIsText={selectedIsText}
          selectedIsShape={selectedIsShape}
          selectedIsLine={selectedIsLine}
          color={color}
          fillGradient={fillGradient}
          strokeColor={selectedIsShape ? shapeStrokeColor : undefined}
          opacity={opacity}
          strokeWeight={brushSize}
          textProps={textProps}
          onOpacityChange={(v) => { setOpacity(v); if (hasSelection) reOpacitySelected(v); }}
          onStrokeWeightChange={(v) => { setBrushSize(v); if (hasSelection) reweightSelected(v); }}
          onApplyText={applyTextProp}
          fillColorOpen={colorPopoverSlot === "toolbar-fill"}
          strokeColorOpen={colorPopoverSlot === "toolbar-stroke"}
          textColorOpen={colorPopoverSlot === "text"}
          onOpenFillColor={() => openColorPopover("toolbar-fill")}
          onOpenStrokeColor={() => openColorPopover("toolbar-stroke")}
          onOpenTextColor={() => openColorPopover("text")}
          onCloseColor={closeColorPopover}
          onFillColorChange={(c) => { setFillGradient(null); setColor(c); if (hasSelection) recolorSelected(c); }}
          onStrokeColorChange={(c) => { setShapeStrokeColor(c); restrokeSelected(c); }}
          onTextColorChange={(c) => { setColor(c); recolorSelected(c); }}
        />
      )}
      <Toolbar
        tool={tool}
        color={color}
        onToolChange={changeTool}
        onAddShape={activateShapeTool}
        onAddText={addText}
        onAddGif={addGif}
        onAddImage={addImage}
        closeSignal={drawingToolsClose}
        uploadSignal={uploadSignal}
        activeShapeType={shapeType}
        onPopoverOpened={onDrawingToolsPopoverOpened}
        onClearRequest={() => setClearConfirmOpen(true)}
      />
      {/* {!panelVisible && <ZoomNav zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onZoomReset={zoomReset} />} */}
      <BoardHeader isSyncing={isSyncing} />

      {/* Top-right cluster: active users */}
      {/* {!panelVisible && (
        <div className="absolute top-5 right-5 z-[200]">
          <ActiveUsers />
        </div>
      )} */}
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
          onDelete={() => deleteFnRef.current?.()}
        />
      )}
      <CapacityWall />

      {/* ── Shared singleton color popover — renders at the top, next to navigation ── */}
      {colorPopoverSlot === "toolbar-fill" && (
        <ColorPopover
          color={color}
          gradient={fillGradient}
          fabricRef={fabricRef}
          onColorChange={(c) => { setFillGradient(null); setColor(c); if (hasSelection) recolorSelected(c); }}
          onGradientChange={(g) => { setFillGradient(g); if (hasSelection) applyFillGradient(g); }}
          onClose={closeColorPopover}
          anchorStyle={{ top: 120, right: 228, bottom: "auto", left: "auto" }}
        />
      )}
      {colorPopoverSlot === "toolbar-stroke" && (
        <ColorPopover
          color={shapeStrokeColor}
          fabricRef={fabricRef}
          onColorChange={(c) => { setShapeStrokeColor(c); restrokeSelected(c); }}
          onClose={closeColorPopover}
          anchorStyle={{ top: 200, right: 228, bottom: "auto", left: "auto" }}
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
          anchorStyle={{ top: 120, right: 228, bottom: "auto", left: "auto" }}
        />
      )}

      {/* ── Clear canvas confirmation ──────────────────────────────────────── */}
      {clearConfirmOpen && (
        <div
          className="fixed inset-0 z-[9990] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          onClick={() => setClearConfirmOpen(false)}
        >
          <div
            className="rounded-2xl shadow-2xl px-8 py-7 max-w-sm w-full mx-4 flex flex-col gap-4"
            style={{
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900 leading-snug">Clear the board?</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              This removes all content for everyone in the room and cannot be undone.
            </p>
            <div className="flex gap-3 justify-end mt-1">
              <button
                onClick={() => setClearConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { clearCanvas(); setClearConfirmOpen(false); }}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile warning banner ─────────────────────────────────────────── */}
      {showMobileWarn && (
        <div
          className="drawing-ui-overlay fixed top-20 left-1/2 -translate-x-1/2 z-[9980] flex items-start gap-3 px-5 py-3 rounded-2xl w-full max-w-sm mx-4"
          style={{
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          }}
        >
          <p className="text-sm text-gray-700 flex-1 leading-relaxed">
            Crumb is best experienced on desktop. Some features may not work on mobile.
          </p>
          <button
            onClick={() => {
              setMobileWarnDismissed(true);
              localStorage.setItem("crumb-mobile-warn-dismissed", "1");
            }}
            className="text-gray-400 hover:text-gray-700 text-lg cursor-pointer flex-shrink-0 leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ── Outer wrapper — provides the Liveblocks room ──────────────────────────
export default function DrawingBoard({ initialObjects }: { initialObjects: { fabricJSON: string }[] }) {
  const [user] = useState(getOrCreateUser);
  return (
    <RoomProvider
      id="main-board"
      initialPresence={{ cursor: null, name: user.name, color: CURSOR_COLORS[0] }}
    >
      <DrawingBoardInner initialObjects={initialObjects} />
    </RoomProvider>
  );
}

