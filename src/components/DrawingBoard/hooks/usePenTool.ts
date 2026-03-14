"use client";

import { useEffect, useRef } from "react";
import type { Canvas } from "fabric";
import type { FabricMods, Tool } from "../types";
import type { SaveableObj } from "./useBoardSync";

// ── Types ─────────────────────────────────────────────────────────────────
interface Anchor {
  x: number;
  y: number;
  /** Outgoing bezier handle offset (relative to anchor) */
  cpOut: { dx: number; dy: number } | null;
  /** Incoming bezier handle offset (relative to anchor) — mirror of cpOut when smooth */
  cpIn:  { dx: number; dy: number } | null;
}

export interface UsePenToolOptions {
  overlayRef:   React.RefObject<HTMLCanvasElement | null>;
  fabricRef:    React.MutableRefObject<Canvas | null>;
  modsRef:      React.MutableRefObject<FabricMods | null>;
  /** true when the pen tool is the active tool */
  active:       boolean;
  colorRef:     React.MutableRefObject<string>;
  brushSizeRef: React.MutableRefObject<number>;
  opacityRef:   React.MutableRefObject<number>;
  saveObject:   (obj: SaveableObj) => void;
  setTool:      (t: Tool) => void;
}

/** Screen-pixel distance threshold within which clicking the first anchor closes the path */
const CLOSE_THRESHOLD_PX = 14;

// ── Hook ──────────────────────────────────────────────────────────────────
export function usePenTool({
  overlayRef,
  fabricRef,
  modsRef,
  active,
  colorRef,
  brushSizeRef,
  opacityRef,
  saveObject,
  setTool,
}: UsePenToolOptions) {
  // All mutable state in refs — event handlers always see current values
  const anchorsRef     = useRef<Anchor[]>([]);
  const mouseRef       = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef  = useRef(false);
  const dragOriginRef  = useRef<{ x: number; y: number } | null>(null);
  const rafRef         = useRef<number>(0);
  const activeRef      = useRef(active);
  activeRef.current = active;

  // ── Helpers ──────────────────────────────────────────────────────────
  function getVpt(): number[] {
    return (fabricRef.current?.viewportTransform ?? [1, 0, 0, 1, 0, 0]) as number[];
  }

  function screenToWorld(clientX: number, clientY: number) {
    const v = getVpt();
    return { x: (clientX - v[4]) / v[0], y: (clientY - v[5]) / v[3] };
  }

  // ── Overlay rendering ─────────────────────────────────────────────────
  function redraw() {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const anchors = anchorsRef.current;
    if (anchors.length === 0) return;

    const v = getVpt();
    const scale = v[0];
    const color = colorRef.current;
    const sw = brushSizeRef.current;
    const mouse = mouseRef.current;

    ctx.save();
    ctx.setTransform(v[0], v[1], v[2], v[3], v[4], v[5]);

    // ── Completed path segments ─────────────────────────────────────
    if (anchors.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(anchors[0].x, anchors[0].y);
      for (let i = 1; i < anchors.length; i++) {
        const p = anchors[i - 1];
        const c = anchors[i];
        ctx.bezierCurveTo(
          p.x + (p.cpOut?.dx ?? 0), p.y + (p.cpOut?.dy ?? 0),
          c.x + (c.cpIn?.dx  ?? 0), c.y + (c.cpIn?.dy  ?? 0),
          c.x, c.y,
        );
      }
      ctx.strokeStyle = color;
      ctx.lineWidth   = sw;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.globalAlpha = 1;
      ctx.stroke();
    }

    // ── Rubber-band: last anchor → mouse ───────────────────────────
    if (mouse) {
      const last = anchors[anchors.length - 1];
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.bezierCurveTo(
        last.x + (last.cpOut?.dx ?? 0), last.y + (last.cpOut?.dy ?? 0),
        mouse.x, mouse.y,
        mouse.x, mouse.y,
      );
      ctx.strokeStyle  = color;
      ctx.lineWidth    = sw;
      ctx.lineCap      = "round";
      ctx.globalAlpha  = 0.45;
      ctx.setLineDash([6 / scale, 4 / scale]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // ── Active-drag bezier handles for the last anchor ──────────────
    if (isDraggingRef.current && anchors.length > 0) {
      const last = anchors[anchors.length - 1];
      if (last.cpOut) {
        const ox = last.x + last.cpOut.dx, oy = last.y + last.cpOut.dy;
        const ix = last.x + (last.cpIn?.dx ?? 0), iy = last.y + (last.cpIn?.dy ?? 0);
        const hr = 4 / scale;

        ctx.strokeStyle = "#4597f8";
        ctx.lineWidth   = 1.5 / scale;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(last.x, last.y);
        ctx.lineTo(ox, oy);
        ctx.stroke();

        ctx.fillStyle = "#4597f8";
        ctx.beginPath(); ctx.arc(ox, oy, hr, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ix, iy, hr, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ── Anchor squares ──────────────────────────────────────────────
    const r = 5 / scale;
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      const nearFirst =
        i === 0 && mouse && anchors.length > 1 &&
        Math.hypot(mouse.x - a.x, mouse.y - a.y) * scale < CLOSE_THRESHOLD_PX;

      ctx.globalAlpha  = 1;
      ctx.strokeStyle  = nearFirst ? "#FF5533" : "#4597f8";
      ctx.fillStyle    = nearFirst ? "rgba(255,85,51,0.2)" : "white";
      ctx.lineWidth    = 2 / scale;
      ctx.beginPath();
      ctx.rect(a.x - r, a.y - r, r * 2, r * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  function scheduleRedraw() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(redraw);
  }

  // ── Reset: clear all pen state and redraw (shows blank overlay) ────
  function reset() {
    anchorsRef.current    = [];
    mouseRef.current      = null;
    isDraggingRef.current = false;
    dragOriginRef.current = null;
    scheduleRedraw();
  }

  // ── Build SVG path string from anchors ───────────────────────────────
  function buildPath(anchors: Anchor[], closed: boolean): string {
    let d = `M ${anchors[0].x} ${anchors[0].y}`;
    for (let i = 1; i < anchors.length; i++) {
      const p = anchors[i - 1];
      const c = anchors[i];
      d +=
        ` C ${p.x + (p.cpOut?.dx ?? 0)} ${p.y + (p.cpOut?.dy ?? 0)}` +
        ` ${c.x + (c.cpIn?.dx  ?? 0)} ${c.y + (c.cpIn?.dy  ?? 0)}` +
        ` ${c.x} ${c.y}`;
    }
    if (closed) {
      const last  = anchors[anchors.length - 1];
      const first = anchors[0];
      d +=
        ` C ${last.x + (last.cpOut?.dx ?? 0)} ${last.y + (last.cpOut?.dy ?? 0)}` +
        ` ${first.x + (first.cpIn?.dx ?? 0)} ${first.y + (first.cpIn?.dy ?? 0)}` +
        ` ${first.x} ${first.y} Z`;
    }
    return d;
  }

  // ── Commit the path to the Fabric canvas ─────────────────────────────
  function finalize(closed: boolean) {
    const anchors = anchorsRef.current;
    const mods    = modsRef.current;
    const fc      = fabricRef.current;
    if (anchors.length < 2 || !mods || !fc) { reset(); setTool("select"); return; }

    const d = buildPath(anchors, closed);

    const path = new mods.Path(d, {
      fill:            closed ? colorRef.current : "",
      stroke:          colorRef.current,
      strokeWidth:     brushSizeRef.current,
      strokeLineCap:   "round",
      strokeLineJoin:  "round",
      opacity:         opacityRef.current,
      paintFirst:      "stroke",
      strokeUniform:   true,
    });

    fc.add(path as Parameters<typeof fc.add>[0]);
    fc.setActiveObject(path as Parameters<typeof fc.setActiveObject>[0]);
    fc.requestRenderAll();
    saveObject(path as unknown as SaveableObj);

    reset();
    setTool("select");
  }

  // ── Main effect: register/unregister on active state ─────────────────
  useEffect(() => {
    // Always keep overlay sized to the window
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.width  = window.innerWidth;
      overlay.height = window.innerHeight;
    }

    if (!active) {
      reset();
      return;
    }

    const fc = fabricRef.current;
    if (!fc) return;

    const upperEl = (fc as unknown as { upperCanvasEl: HTMLElement }).upperCanvasEl;

    // ── Mouse handlers ──────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const pos     = screenToWorld(e.clientX, e.clientY);
      const anchors = anchorsRef.current;

      // Close path when clicking near the first anchor
      if (anchors.length > 1) {
        const scale = getVpt()[0];
        if (Math.hypot(pos.x - anchors[0].x, pos.y - anchors[0].y) * scale < CLOSE_THRESHOLD_PX) {
          finalize(true);
          return;
        }
      }

      isDraggingRef.current  = true;
      dragOriginRef.current  = { ...pos };
      anchors.push({ x: pos.x, y: pos.y, cpIn: null, cpOut: null });
      scheduleRedraw();
    };

    const onMouseMove = (e: MouseEvent) => {
      const pos = screenToWorld(e.clientX, e.clientY);
      mouseRef.current = pos;

      if (isDraggingRef.current && dragOriginRef.current) {
        const anchors = anchorsRef.current;
        const last    = anchors[anchors.length - 1];
        if (last) {
          const dx    = pos.x - dragOriginRef.current.x;
          const dy    = pos.y - dragOriginRef.current.y;
          const scale = getVpt()[0];
          // Only activate handles once drag exceeds 4 screen px (distinguishes click from drag)
          if (Math.hypot(dx, dy) * scale > 4) {
            last.cpOut = { dx,  dy  };
            last.cpIn  = { dx: -dx, dy: -dy };
          }
        }
      }

      scheduleRedraw();
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      dragOriginRef.current = null;
    };

    // Double-click finishes an open path.
    // The second click of the dblclick already added an anchor via mousedown — remove it.
    const onDblClick = () => {
      if (anchorsRef.current.length > 1) anchorsRef.current.pop();
      finalize(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (e.key === "Enter")  { e.preventDefault(); finalize(false); }
      if (e.key === "Escape") { e.preventDefault(); reset(); setTool("select"); }
    };

    const onResize = () => {
      if (overlayRef.current) {
        overlayRef.current.width  = window.innerWidth;
        overlayRef.current.height = window.innerHeight;
        scheduleRedraw();
      }
    };

    upperEl.addEventListener("mousedown", onMouseDown);
    upperEl.addEventListener("mousemove", onMouseMove);
    upperEl.addEventListener("mouseup",   onMouseUp);
    upperEl.addEventListener("dblclick",  onDblClick);
    window.addEventListener("keydown",    onKeyDown);
    window.addEventListener("resize",     onResize);

    return () => {
      upperEl.removeEventListener("mousedown", onMouseDown);
      upperEl.removeEventListener("mousemove", onMouseMove);
      upperEl.removeEventListener("mouseup",   onMouseUp);
      upperEl.removeEventListener("dblclick",  onDblClick);
      window.removeEventListener("keydown",    onKeyDown);
      window.removeEventListener("resize",     onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  // All mutable values accessed via refs, so only `active` needs to be in deps
}
