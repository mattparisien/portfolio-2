"use client";

import classNames from "classnames";
import type { Canvas } from "fabric";
import { useEffect, useRef, useState, useCallback } from "react";
import { LockClosedIcon, LockOpenIcon, TrashIcon, LinkIcon } from "./Icons";
import ToolOverlaySurface from "./ToolOverlaySurface";

interface ObjectLockButtonProps {
  fabricRef: React.MutableRefObject<Canvas | null>;
  locked: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  /** Whether the currently selected object is a text object */
  isText?: boolean;
  /** Called when a hyperlink URL should be applied to the selected text */
  onSetLink?: (url: string | null) => void;
  /** Current hyperlink on the selected text (if any) */
  currentLink?: string | null;
}

function LockIcon({ open, className }: { open: boolean; className?: string }) {

  const SIZE = 17;

  return open ? (
    <LockOpenIcon width={SIZE} height={SIZE} strokeWidth={1} className={className} />
  ) : (
    <LockClosedIcon width={SIZE} height={SIZE} strokeWidth={1} className={className} />
  );
}

function IconBtn({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      className={classNames(
        "flex items-center justify-center cursor-pointer active:scale-95 rounded-lg !p-1 transition-colors",
        { "bg-accent/40": active, "hover:bg-overlay-hover": !active }
      )}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}

export default function ObjectLockButton({ fabricRef, locked, onToggle, onDelete, isText, onSetLink, currentLink }: ObjectLockButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync link input to current link when selection changes
  useEffect(() => {
    setLinkInput(currentLink ?? "");
    setLinkPopoverOpen(false);
  }, [currentLink]);

  const handleLinkBtnClick = useCallback(() => {
    setLinkInput(currentLink ?? "");
    setLinkPopoverOpen(prev => !prev);
  }, [currentLink]);

  useEffect(() => {
    if (linkPopoverOpen) {
      // Focus input on next tick after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [linkPopoverOpen]);

  const handleApplyLink = useCallback(() => {
    const trimmed = linkInput.trim();
    if (!trimmed) {
      onSetLink?.(null);
    } else {
      let url: string;
      if (/^https?:\/\//i.test(trimmed)) {
        // Already has a scheme — use as-is
        url = trimmed;
      } else if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
        // Relative path — store as-is
        url = trimmed;
      } else {
        // Bare domain — prepend https://
        url = `https://${trimmed}`;
      }
      onSetLink?.(url);
    }
    setLinkPopoverOpen(false);
  }, [linkInput, onSetLink]);

  const handleRemoveLink = useCallback(() => {
    onSetLink?.(null);
    setLinkInput("");
    setLinkPopoverOpen(false);
  }, [onSetLink]);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const fc = fabricRef.current;
      const obj = fc?.getActiveObject();
      if (!fc || !obj) return;

      const vpt = fc.viewportTransform as number[];
      const r = obj.getBoundingRect();
      // Convert world-space bounding box to screen pixels
      const sx = (r.left + r.width / 2) * vpt[0] + vpt[4];
      // Place just above the top edge of the selection bounding box
      const sy = r.top * vpt[3] + vpt[5] - 12;
      // Clamp to stay below the BoardHeader (~60px tall) plus a small margin
      const clampedTop = Math.max(sy, 72);

      // Hide the button when the object's anchor point is outside the visible viewport
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (sx < 0 || sx > W || sy > H) {
        btn.style.visibility = "hidden";
        return;
      }

      btn.style.visibility = "visible";
      btn.style.left = `${sx}px`;
      btn.style.top = `${clampedTop}px`;
      btn.style.transform = "translate(-50%, -100%)";
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [fabricRef]);

  const hasLink = !!(currentLink && currentLink.trim());

  return (
    <div
      ref={btnRef}
      className="fixed -left-[9999px] -top-[9999px] select-none"
      style={{ zIndex: 150 }}
    >
      {/* Link input popover — rendered above the main pill */}
      {linkPopoverOpen && isText && (
        <div
          className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 rounded-xl border border-neutral-200 bg-overlay-bg overflow-hidden select-none"
          style={{ minWidth: 248, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        >
          <div className="px-3 pt-2.5 pb-1.5">
            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wide mb-1.5">URL</p>
            <input
              ref={inputRef}
              type="url"
              value={linkInput}
              onChange={e => setLinkInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleApplyLink();
                if (e.key === "Escape") setLinkPopoverOpen(false);
              }}
              placeholder="https://example.com"
              className="w-full text-xs outline-none bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-900 placeholder:text-neutral-400 focus:border-accent transition-colors"
              style={{ fontFamily: "inherit" }}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-100">
            {hasLink ? (
              <button
                onClick={handleRemoveLink}
                title="Remove link"
                className="text-xs text-red-400 hover:text-red-500 transition-colors cursor-pointer font-medium"
              >
                Remove
              </button>
            ) : <span />}
            <button
              onClick={handleApplyLink}
              title="Apply link"
              className="text-xs font-semibold text-accent hover:opacity-70 transition-opacity cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Main pill — lock / link / delete */}
      <ToolOverlaySurface className="flex items-center gap-0 !p-1">
        <IconBtn
          onClick={onToggle}
          title={locked ? "Unlock object" : "Lock object"}
          active={locked}
        >
          <LockIcon open={!locked} className={classNames("", {
            "[&>path]:stroke-accent": locked,
            "[&>path]:stroke-overlay-fg": !locked,
          })}/>
        </IconBtn>
        {isText && !locked && onSetLink && (
          <IconBtn
            onClick={handleLinkBtnClick}
            title={hasLink ? "Edit link" : "Add link"}
            active={hasLink || linkPopoverOpen}
          >
            <LinkIcon
              width={15}
              height={15}
              strokeWidth={0.8}
              className={classNames(
                hasLink || linkPopoverOpen ? "text-accent" : "text-overlay-fg"
              )}
            />
          </IconBtn>
        )}
        {onDelete && !locked && (
          <IconBtn onClick={onDelete} title="Delete object">
            <TrashIcon width={16} height={16} strokeWidth={1} className={"[&>path]:stroke-overlay-fg"}/>
          </IconBtn>
        )}
      </ToolOverlaySurface>
    </div>
  );
}
