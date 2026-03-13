"use client";

import classNames from "classnames";
import { useEffect, useRef, useState, type RefObject } from "react";
import { IoTriangleSharp } from "react-icons/io5";
import {
  MdAutoFixOff,
  MdBrush
} from "react-icons/md";
import { PiGifFill } from "react-icons/pi";
import type { ShapeType, Tool } from "../types";
import GifPicker from "./GifPicker";
import {
  ChevronUpIcon,
  CircleIcon,
  EraserIcon,
  HeartIcon,
  LineIcon,
  PencilIcon,
  PenIcon,
  SelectIcon,
  SquareIcon,
  StarIcon,
  TextIcon,
  TriangleIcon,
  UploadIcon
} from "./Icons";

const ICON_SIZE = 17;
const ICON_STROKE_WIDTH = 1;
const ICON_COLOR = "black";
const ICON_COLOR_ACTIVE = "white";

const makeIcons = (color: string): { type: ShapeType; label: string; icon: React.ReactNode }[] => [
  { type: "select", label: "Select", icon: <SelectIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
  { type: "text", label: "Text", icon: <TextIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
  { type: "rect", label: "Rectangle", icon: <SquareIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
  { type: "circle", label: "Circle", icon: <CircleIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
  { type: "triangle", label: "Triangle", icon: <TriangleIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
  { type: "star", label: "Star", icon: <StarIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
  { type: "heart", label: "Heart", icon: <HeartIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
  { type: "pencil", label: "Pencil", icon: <PencilIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
  { type: "brush", label: "Brush", icon: <PenIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
  { type: "line", label: "Line", icon: <LineIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
  { type: "eraser", label: "Eraser", icon: <EraserIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
  { type: "upload", label: "Upload", icon: <UploadIcon width={ICON_SIZE} height={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} stroke={color} /> },
];

const SHAPES_TYPES = ["rect", "circle", "triangle", "star", "heart"];

interface DrawingToolsProps {
  tool: Tool;
  color: string;
  onToolChange: (t: Tool) => void;
  onAddShape: (shape: ShapeType) => void;
  onAddText: () => void;
  onAddGif: (id: string, url: string) => void;
  onAddImage?: (url: string) => void;
  /** The shape type currently active in the parent (set by keyboard shortcut) */
  activeShapeType?: ShapeType;
  /** Incremented by the parent whenever another component opens a popover */
  closeSignal?: number;
  /** Incremented by the parent to programmatically trigger the upload dialog */
  uploadSignal?: number;
  /** Called when this component opens any of its own popovers */
  onPopoverOpened?: () => void;
  onClearRequest?: () => void;
}



export default function DrawingTools({
  tool, onToolChange, onAddShape, onAddText, onAddGif, onAddImage, closeSignal, uploadSignal, activeShapeType, onPopoverOpened, onClearRequest,
}: DrawingToolsProps) {
  const [lastShape, setLastShape] = useState<ShapeType>("rect");
  const [drawOpen, setDrawOpen] = useState(false);
  const [shapeOpen, setShapeOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gifPopoverStyle, setGifPopoverStyle] = useState<React.CSSProperties>({});
  const uploadFileRef = useRef<HTMLInputElement>(null);
  const gifButtonRef = useRef<HTMLButtonElement>(null);

  // Close all when a sibling component opens a popover
  useEffect(() => {
    if (!closeSignal) return;
    setDrawOpen(false);
    setShapeOpen(false);
    setGifOpen(false);
  }, [closeSignal]);

  // Open upload dialog when parent signals (e.g. keyboard shortcut)
  useEffect(() => {
    if (!uploadSignal) return;
    uploadFileRef.current?.click();
  }, [uploadSignal]);

  // Sync lastShape when parent activates a shape tool via keyboard shortcut
  useEffect(() => {
    if (tool === "shape" && activeShapeType) setLastShape(activeShapeType);
  }, [tool, activeShapeType]);

  const drawWrapRef = useRef<HTMLDivElement>(null);
  const drawPopoverRef = useRef<HTMLDivElement>(null);
  const shapeWrapRef = useRef<HTMLDivElement>(null);
  const shapePopoverRef = useRef<HTMLDivElement>(null);
  const gifWrapRef = useRef<HTMLDivElement>(null);
  const gifPopoverRef = useRef<HTMLDivElement>(null);

  // Click-outside: draw popover
  useEffect(() => {
    if (!drawOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !drawWrapRef.current?.contains(e.target as Node) &&
        !drawPopoverRef.current?.contains(e.target as Node)
      ) setDrawOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [drawOpen]);

  // Click-outside: shape popover
  useEffect(() => {
    if (!shapeOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !shapeWrapRef.current?.contains(e.target as Node) &&
        !shapePopoverRef.current?.contains(e.target as Node)
      ) setShapeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [shapeOpen]);

  // Click-outside: gif popover
  useEffect(() => {
    if (!gifOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        !gifWrapRef.current?.contains(e.target as Node) &&
        !gifPopoverRef.current?.contains(e.target as Node)
      ) setGifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [gifOpen]);

  // Stop canvas scroll/touch handlers stealing events inside GIF popover
  useEffect(() => {
    const el = gifPopoverRef.current;
    if (!el || !gifOpen) return;
    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener("wheel", stop, { passive: false });
    el.addEventListener("touchstart", stop, { passive: false });
    el.addEventListener("touchmove", stop, { passive: false });
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("touchmove", stop);
    };
  }, [gifOpen]);

  const handleUploadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok && json.url) onAddImage?.(json.url);
    } finally {
      setUploading(false);
    }
  };

  const toolBtn = (
    active: boolean,
    onClick: () => void,
    title: string,
    icon: React.ReactNode,
    opts?: {
      btnRef?: RefObject<HTMLButtonElement | null>;
      disabled?: boolean;
      ariaExpanded?: boolean;
      activeClass?: string;
      extraClass?: string;
      paddingClass?: string;
    }
  ) => {
    const activeClass = opts?.activeClass ?? "bg-accent text-white";
    return (
      <button
        ref={opts?.btnRef}
        title={title}
        aria-label={title}
        aria-expanded={opts?.ariaExpanded}
        disabled={opts?.disabled}
        onClick={onClick}
        className={classNames("rounded-md flex items-center justify-center transition-colors cursor-pointer", {
          [activeClass]: active,
          "text-[#111] hover:bg-black/[0.07]": !active,
          "disabled:opacity-50 disabled:cursor-not-allowed": opts?.disabled,
          [opts?.extraClass ?? ""]: !!opts?.extraClass,
          [opts?.paddingClass ?? ""]: !!opts?.paddingClass,
          "p-2": !opts?.paddingClass,
        })}
      >
        {icon}
      </button>
    );
  };

  const arrowBtn = (
    open: boolean,
    onClick: () => void,
    ariaLabel: string,
  ) => (
    <button
      title={ariaLabel}
      aria-label={ariaLabel}
      aria-expanded={open}
      onClick={onClick}
      className={classNames("rounded-md flex items-center justify-center transition-colors cursor-pointer px-1 py-2 text-[#111]", {
        "bg-black/[0.08]": open,
        "hover:bg-black/[0.07]": !open,
      })}
    >
      <ChevronUpIcon height={ICON_SIZE} width={6} strokeWidth={ICON_STROKE_WIDTH} className={`transition-transform duration-150 ${open ? "" : "rotate-180"}`} />
    </button>
  );

  const popoverStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.97)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(0,0,0,0.08)",
  };

  const isDrawActive = tool === "pencil" || tool === "brush" || tool === "line" || tool === "eraser";
  const drawIconColor = isDrawActive ? ICON_COLOR_ACTIVE : ICON_COLOR;
  const drawIcon = tool === "brush" && isDrawActive
    ? <MdBrush className="w-5 h-5" />
    : tool === "eraser" && isDrawActive
      ? <MdAutoFixOff className="w-5 h-5" />
      : tool === "line" && isDrawActive
        ? makeIcons(drawIconColor).find(x => x.type === "line")?.icon
        : makeIcons(drawIconColor).find(x => x.type === "pencil")?.icon;

  const shapeIconColor = tool === "shape" ? ICON_COLOR_ACTIVE : ICON_COLOR;
  const lastShapeIcon = makeIcons(shapeIconColor).find(s => s.type === lastShape)?.icon ?? <IoTriangleSharp className="w-5 h-5" />;


  return (
    <div
      className="drawing-ui-overlay fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-2xl z-[200]"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      {/* Select */}
      {toolBtn(
        tool === "select",
        () => onToolChange("select"),
        "Select",
        makeIcons(tool === "select" ? ICON_COLOR_ACTIVE : ICON_COLOR).find(x => x.type === "select")?.icon,
      )}



      {/* Text */}
      {toolBtn(
        tool === "text",
        () => onAddText(),
        "Text",
        makeIcons(tool === "text" ? ICON_COLOR_ACTIVE : ICON_COLOR).find(x => x.type === "text")?.icon
      )}



      {/* Draw: primary = activate current draw tool (default pencil), chevron = brush / eraser picker */}
      <div ref={drawWrapRef} className="relative flex items-center">
        {toolBtn(
          isDrawActive,
          () => { if (!isDrawActive) onToolChange("pencil"); setDrawOpen(false); },
          tool === "brush" ? "Brush" : tool === "eraser" ? "Eraser" : tool === "line" ? "Line" : "Pencil",
          drawIcon,
        )}
        {arrowBtn(
          drawOpen,
          () => {
            const next = !drawOpen;
            setDrawOpen(next);
            if (next) { setShapeOpen(false); setGifOpen(false); onPopoverOpened?.(); }
          },
          "Drawing tools",
        )}

        {drawOpen && (
          <div
            ref={drawPopoverRef}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-2 p-3 rounded-2xl popover-enter-up z-[300]"
            style={popoverStyle}
          >
            {(
              [
                { t: "pencil" as Tool, label: "Pencil" },
                { t: "line" as Tool, label: "Line" },
                { t: "brush" as Tool, label: "Brush" },
                { t: "eraser" as Tool, label: "Eraser" },
              ] as const
            ).map(({ t, label }) => {
              const icon = makeIcons(tool === t ? ICON_COLOR_ACTIVE : ICON_COLOR).find(i => i.type === t)?.icon;
              return (
                <button
                  key={t}
                  title={label}
                  aria-label={label}
                  onClick={() => { onToolChange(t); setDrawOpen(false); }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors flex-1 min-w-[52px] cursor-pointer ${tool === t ? "bg-accent text-white" : "text-[#111] hover:bg-black/[0.07]"
                    }`}
                >
                  {icon}
                  <span className={`text-xs leading-none ${tool === t ? "text-white/70" : "text-gray-400"}`}>{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>



      {/* Shapes: primary = activate shape draw mode, chevron = shape picker */}
      <div ref={shapeWrapRef} className="relative flex items-center">
        {toolBtn(
          tool === "shape",
          () => onAddShape(lastShape),
          `Draw ${lastShape}`,
          lastShapeIcon,
        )}
        {arrowBtn(
          shapeOpen,
          () => {
            const next = !shapeOpen;
            setShapeOpen(next);
            if (next) { setDrawOpen(false); setGifOpen(false); onPopoverOpened?.(); }
          },
          "Shape options",
        )}

        {shapeOpen && (
          <div
            ref={shapePopoverRef}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-2 p-3 rounded-2xl popover-enter-up z-[300]"
            style={{ ...popoverStyle, minWidth: 220 }}
          >
            {makeIcons(ICON_COLOR).filter(i => SHAPES_TYPES.includes(i.type)).map((s) => (
              <button
                key={s.type}
                title={s.label}
                aria-label={s.label}
                onClick={() => {
                  setLastShape(s.type);
                  onAddShape(s.type);
                  setShapeOpen(false);
                }}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-black/[0.07] transition-colors flex-1 cursor-pointer text-[#1a1a1a]"
              >
                {s.icon}
                <span className="text-xs text-gray-400 leading-none">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>



      {/* GIF / Sticker picker */}
      <div ref={gifWrapRef} className="relative">
        {toolBtn(
          gifOpen,
          () => {
            const next = !gifOpen;
            setGifOpen(next);
            if (next) {
              setDrawOpen(false);
              setShapeOpen(false);
              onPopoverOpened?.();
              // Compute position in wrapper-local coords to avoid the
              // fixed-inside-transformed-ancestor bug (the toolbar has
              // transform: translateX(-50%) which creates a new containing block).
              if (gifButtonRef.current && gifWrapRef.current) {
                const btnRect = gifButtonRef.current.getBoundingClientRect();
                const wrapRect = gifWrapRef.current.getBoundingClientRect();
                const POPOVER_W = Math.min(420, window.innerWidth - 16);
                let leftRel = btnRect.left + btnRect.width / 2 - wrapRect.left - POPOVER_W / 2;
                // Clamp so popover stays within viewport
                leftRel = Math.max(8 - wrapRect.left, Math.min(leftRel, window.innerWidth - POPOVER_W - 8 - wrapRect.left));
                setGifPopoverStyle({ position: "absolute", left: leftRel, bottom: "calc(100% + 8px)", width: POPOVER_W });
              }
            }
          },
          "Add GIF or Sticker",
          <PiGifFill className="w-5 h-5" />,
          { btnRef: gifButtonRef, ariaExpanded: gifOpen, activeClass: "bg-black/[0.07] text-[#111]" },
        )}

        {gifOpen && (
          <div
            ref={gifPopoverRef}
            className="p-3 rounded-2xl z-[300] popover-enter-up"
            style={{ ...popoverStyle, ...gifPopoverStyle }}
          >
            <GifPicker
              onSelect={(id, url) => {
                onAddGif(id, url);
                setGifOpen(false);
              }}
            />
          </div>
        )}
      </div>



      {/* Upload image — opens file dialog directly */}
      {toolBtn(
        false,
        () => uploadFileRef.current?.click(),
        "Upload image",
        uploading ? (
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          makeIcons(ICON_COLOR).find(i => i.type === "upload")?.icon
        ),
        { disabled: uploading },
      )}
      <input
        ref={uploadFileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleUploadFileChange}
      />
    </div>
  );
}
