import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Canvas, IText } from "fabric";
import type { TextProps, TextGradient } from "../types";
import { DEFAULT_TEXT_PROPS } from "../types";
import type { SaveableObj } from "./useBoardSync";

// ── extractTextProps ──────────────────────────────────────────────────────

/** Normalize Fabric's rgb(...) / rgba(...) color values back to #rrggbb hex */
function toHex(c: string): string {
  const rgb = c.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
  if (!rgb) return c;
  return (
    "#" +
    [rgb[1], rgb[2], rgb[3]]
      .map((n) => parseInt(n).toString(16).padStart(2, "0"))
      .join("")
  );
}

function extractTextProps(txt: IText): TextProps {
  const align = (txt.textAlign as string) || "left";
  const fill  = txt.fill;
  let gradient: TextGradient | null = null;

  if (fill && typeof fill === "object" && "colorStops" in fill) {
    const stops = (fill as { colorStops: { offset: number; color: string }[] }).colorStops
      .slice()
      .sort((a, b) => a.offset - b.offset);
    if (stops.length >= 2) {
      const cs = fill as { colorStops: { offset: number; color: string }[]; coords?: { x1: number; y1: number; x2: number; y2: number } };
      let angle = 90;
      if (cs.coords) {
        const { x1 = 0, y1 = 0, x2 = 1, y2 = 0 } = cs.coords;
        angle = ((Math.round(Math.atan2(x2 - x1, -(y2 - y1)) * 180 / Math.PI)) + 360) % 360;
      }
      gradient = { stops: stops.map(s => ({ offset: s.offset, color: s.color })), angle };
    }
  }

  return {
    fontFamily:  (txt.fontFamily  as string) || DEFAULT_TEXT_PROPS.fontFamily,
    fontSize:    (txt.fontSize    as number) || DEFAULT_TEXT_PROPS.fontSize,
    bold:        txt.fontWeight === "bold" || txt.fontWeight === 700,
    italic:      txt.fontStyle === "italic",
    underline:   !!txt.underline,
    linethrough: !!txt.linethrough,
    uppercase:   !!(txt as unknown as Record<string, unknown>)._uppercase,
    lineHeight:  (txt.lineHeight  as number) || DEFAULT_TEXT_PROPS.lineHeight,
    charSpacing: (txt.charSpacing as number) ?? DEFAULT_TEXT_PROPS.charSpacing,
    textAlign:   align === "center" || align === "right" ? align : "left",
    gradient,
  };
}

// ── useSelectionState ─────────────────────────────────────────────────────

interface UseSelectionStateOptions {
  fabricRef:          React.MutableRefObject<Canvas | null>;
  isReady:            boolean;
  pendingMultiSaveRef: React.MutableRefObject<SaveableObj[] | null>;
  saveObject:         (obj: SaveableObj) => void;
  setHasSelection:    (v: boolean) => void;
  setSelectedIsText:  (v: boolean) => void;
  setSelectedIsGif:   (v: boolean) => void;
  setSelectedIsImage?: (v: boolean) => void;
  setImageBlendMode?:  (v: string) => void;
  setSelectedIsPath:  (v: boolean) => void;
  setSelectedIsLine:  (v: boolean) => void;
  setSelectedIsLocked:(v: boolean) => void;
  setShapeStrokeColor:(c: string) => void;
  setColor:           (c: string) => void;
  setBrushSize:       (s: number) => void;
  setOpacity:         (v: number) => void;
  setTextProps:       Dispatch<SetStateAction<TextProps>>;
}

/**
 * Registers Fabric selection events and maps them to React state.
 * Also handles multi-object deferred saves via pendingMultiSaveRef.
 */
export function useSelectionState({
  fabricRef,
  isReady,
  pendingMultiSaveRef,
  saveObject,
  setHasSelection,
  setSelectedIsText,
  setSelectedIsGif,
  setSelectedIsImage,
  setImageBlendMode,
  setSelectedIsPath,
  setSelectedIsLine,
  setSelectedIsLocked,
  setShapeStrokeColor,
  setColor,
  setBrushSize,
  setOpacity,
  setTextProps,
}: UseSelectionStateOptions): void {
  // Latest-value refs for all setters (all are stable state setters, but
  // saveObject might not be — keep it fresh anyway).
  const saveRef = useRef(saveObject);
  saveRef.current = saveObject;

  useEffect(() => {
    if (!isReady) return;
    const fc = fabricRef.current;
    if (!fc) return;

    const handleSelectionChange = () => {
      setHasSelection(true);
      const obj = fc.getActiveObject();

      const isText  = !!obj && ["i-text", "textbox"].includes((obj as { type?: string }).type ?? "");
      const isGif   = !!obj && !!(obj as { giphyId?: string }).giphyId;
      const isVideo = !!obj && !!(obj as unknown as Record<string, unknown>)._isVideo;
      const isImage = !!obj && (obj as { type?: string }).type === "image" && !isGif && !isVideo;
      const isPath  = !!obj && (obj as { type?: string }).type === "path"  && !isGif;
      const isLine  = !!obj && (obj as { type?: string }).type === "line";

      setSelectedIsText(isText);
      setSelectedIsGif(isGif);
      setSelectedIsImage?.(isImage);

      if (isImage) {
        const bm = (obj as unknown as Record<string, unknown>).globalCompositeOperation;
        setImageBlendMode?.(typeof bm === "string" && bm ? bm : "source-over");
      }

      setSelectedIsPath(isPath);
      setSelectedIsLine(isLine);

      if (isText) setTextProps(extractTextProps(obj as IText));

      if (isPath) {
        const p = obj as unknown as { stroke?: string; strokeWidth?: number; opacity?: number };
        if (p.stroke)                setColor(toHex(p.stroke));
        if (p.strokeWidth != null)   setBrushSize(p.strokeWidth);
        if (p.opacity     != null)   setOpacity(p.opacity);
      }
      if (isLine) {
        const l = obj as unknown as { stroke?: string; strokeWidth?: number; opacity?: number };
        if (typeof l.stroke === "string" && l.stroke) setColor(toHex(l.stroke));
        if (l.strokeWidth != null) setBrushSize(l.strokeWidth);
        if (l.opacity     != null) setOpacity(l.opacity);
      }
      if (!isText && !isGif && !isImage && !isPath && !isLine && obj) {
        const s = obj as unknown as { fill?: string; stroke?: string; opacity?: number };
        if (typeof s.fill === "string" && s.fill) setColor(toHex(s.fill));
        if (s.opacity != null) setOpacity(s.opacity);
        const st = s.stroke;
        setShapeStrokeColor(st && st !== "transparent" && st !== "" ? toHex(st) : "#000000");
      }

      setSelectedIsLocked(!!(obj as unknown as Record<string, unknown>)?.lockMovementX);
    };

    const handleTextEditingEntered = () => {
      // Fabric fires selection:cleared when text enters editing; re-assert here.
      setHasSelection(true);
      setSelectedIsText(true);
    };

    const handleSelectionCleared = () => {
      setHasSelection(false);
      setSelectedIsText(false);
      setSelectedIsGif(false);
      setSelectedIsImage?.(false);
      setImageBlendMode?.("source-over");
      setSelectedIsPath(false);
      setSelectedIsLine(false);
      setSelectedIsLocked(false);

      if (!pendingMultiSaveRef.current) return;
      const objs = pendingMultiSaveRef.current;
      pendingMultiSaveRef.current = null;
      objs.forEach(obj => saveRef.current(obj));
    };

    fc.on("selection:created",       handleSelectionChange);
    fc.on("selection:updated",       handleSelectionChange);
    fc.on("text:editing:entered",    handleTextEditingEntered);
    fc.on("selection:cleared",       handleSelectionCleared);

    return () => {
      fc.off("selection:created",    handleSelectionChange);
      fc.off("selection:updated",    handleSelectionChange);
      fc.off("text:editing:entered", handleTextEditingEntered);
      fc.off("selection:cleared",    handleSelectionCleared);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);
}
