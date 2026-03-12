"use client";

import { useRef, useEffect } from "react";
import type { Canvas } from "fabric";
import { MdLock, MdLockOpen, MdDeleteOutline } from "react-icons/md";

interface ObjectLockButtonProps {
  fabricRef: React.MutableRefObject<Canvas | null>;
  locked: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}

function LockIcon({ open }: { open: boolean }) {
  return open ? (
    <MdLockOpen size={16} />
  ) : (
    <MdLock size={16} />
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
      const r   = obj.getBoundingRect();
      // Convert world-space bounding box to screen pixels
      const sx  = (r.left + r.width / 2) * vpt[0] + vpt[4];
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
      btn.style.left      = `${sx}px`;
      btn.style.top       = `${clampedTop}px`;
      btn.style.transform = "translate(-50%, -100%)";
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [fabricRef]);

  return (
    <div
      ref={btnRef}
      className="fixed z-[300] flex items-center select-none"
      style={{
        left: "-9999px",
        top: "-9999px",
        background: "rgba(255,255,255,0.96)",
        border: "1px solid rgba(0,0,0,0.1)",
        backdropFilter: "blur(12px)",
        borderRadius: 999,
        padding: "5px 10px",
        gap: 0,
      }}
    >
      <button
        className="flex items-center justify-center cursor-pointer hover:opacity-70 active:scale-95 transition-opacity"
        style={{
          background: locked ? "#111" : "transparent",
          color: locked ? "#fff" : "#444",
          padding: "2px 6px",
          borderRadius: 999,
        }}
        onClick={onToggle}
        title={locked ? "Unlock object" : "Lock object"}
        aria-label={locked ? "Unlock object" : "Lock object"}
      >
        <LockIcon open={!locked} />
      </button>
      {onDelete && !locked && (
        <>
          <div style={{ width: 1, height: 16, background: "rgba(0,0,0,0.08)", flexShrink: 0 }} />
          <button
            className="flex items-center justify-center cursor-pointer hover:opacity-70 active:scale-95 transition-opacity"
            style={{
              color: "#444",
              padding: "2px 6px",
            }}
            onClick={onDelete}
            title="Delete object"
            aria-label="Delete object"
          >
            <MdDeleteOutline size={16} />
          </button>
        </>
      )}
    </div>
  );
}
