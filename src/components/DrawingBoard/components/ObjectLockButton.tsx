"use client";

import classNames from "classnames";
import type { Canvas } from "fabric";
import { useEffect, useRef } from "react";
import { LockClosedIcon, LockOpenIcon, TrashIcon } from "./Icons";
import ToolOverlaySurface from "./ToolOverlaySurface";

interface ObjectLockButtonProps {
  fabricRef: React.MutableRefObject<Canvas | null>;
  locked: boolean;
  onToggle: () => void;
  onDelete?: () => void;
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

export default function ObjectLockButton({ fabricRef, locked, onToggle, onDelete }: ObjectLockButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

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

  return (
    <ToolOverlaySurface
      ref={btnRef}
      className="fixed flex items-center select-none -left-[9999px] -top-[9999px] gap-0 !p-1"
    >
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
      {onDelete && !locked && (
        <>
          <IconBtn onClick={onDelete} title="Delete object">
            <TrashIcon width={16} height={16} strokeWidth={1} className={"[&>path]:stroke-overlay-fg"}/>
          </IconBtn>
        </>
      )}
    </ToolOverlaySurface>
  );
}
