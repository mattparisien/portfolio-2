"use client";

import { useOthers } from "@/liveblocks.config";

/** Figma-style cursor: sharp arrow + rounded-rect name label. */
function Cursor({ x, y, name, color }: { x: number; y: number; name: string; color: string }) {
  return (
    <div
      className="pointer-events-none fixed z-[100]"
      style={{
        left: x,
        top: y,
        transition: "left 55ms linear, top 55ms linear",
        willChange: "left, top",
      }}
    >
      {/* Cursor arrow — Figma-accurate shape, tip at 0,0 */}
      <svg
        width="20"
        height="24"
        viewBox="0 0 20 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" }}
      >
        <path
          d="M0 0 L0 20 L5 15 L8.5 23 L11 22 L7.5 14 L14 14 Z"
          fill={color}
        />
        <path
          d="M0 0 L0 20 L5 15 L8.5 23 L11 22 L7.5 14 L14 14 Z"
          fill="none"
          stroke="white"
          strokeWidth="1.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      {/* Name label — matches Figma's rounded-rect tag */}
      <div
        className="absolute text-white font-semibold whitespace-nowrap select-none"
        style={{
          top: 18,
          left: 12,
          background: color,
          borderRadius: 6,
          padding: "3px 8px",
          fontSize: 13,
          lineHeight: "18px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          letterSpacing: "0.01em",
        }}
      >
        {name}
      </div>
    </div>
  );
}

export default function RemoteCursors() {
  const others = useOthers();

  return (
    <>
      {others.map(({ connectionId, presence }) => {
        if (!presence.cursor) return null;
        return (
          <Cursor
            key={connectionId}
            x={presence.cursor.x}
            y={presence.cursor.y}
            name={presence.name}
            color={presence.color}
          />
        );
      })}
    </>
  );
}
