"use client";

import { useRef, useEffect } from "react";
import type { Canvas } from "fabric";
import { MdLock, MdLockOpen } from "react-icons/md";

interface ObjectLockButtonProps {
  fabricRef: React.MutableRefObject<Canvas | null>;
  locked: boolean;
  onToggle: () => void;
}

function LockIcon({ open }: { open: boolean }) {
  return open ? (
    <MdLockOpen size={13} />
  ) : (
    <MdLock size={13} />
  );
}

export default function ObjectLockButton({ fabricRef, locked, onToggle }: ObjectLockButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
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
      // Place just above the object's top edge
      const sy = r.top * vpt[3] + vpt[5] - 10;

      // Hide the button when the object's anchor point is outside the visible viewport
      const W = window.innerWidth;
      const H = window.innerHeight;
      if (sx < 0 || sx > W || sy < 0 || sy > H) {
        btn.style.visibility = "hidden";
        return;
      }

      btn.style.visibility = "visible";
      btn.style.left      = `${sx}px`;
      btn.style.top       = `${sy}px`;
      btn.style.transform = "translate(-50%, -100%)";
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [fabricRef]);

  return (
    <button
      ref={btnRef}
      className="fixed z-[300] flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer hover:scale-105 active:scale-95 select-none"
      style={{
        background: locked ? "#111" : "rgba(255,255,255,0.96)",
        border: locked ? "none" : "1px solid rgba(0,0,0,0.1)",
        backdropFilter: "blur(12px)",
        color: locked ? "#fff" : "#444",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        // Initial off-screen position until first RAF tick
        left: "-9999px",
        top: "-9999px",
      }}
      onClick={onToggle}
      title={locked ? "Unlock object" : "Lock object"}
    >
      <LockIcon open={!locked} />
    </button>
  );
}
