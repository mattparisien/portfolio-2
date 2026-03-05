"use client";

import { useOthers } from "@/liveblocks.config";

/** Figma-style remote cursor: triangle arrow + name pill. */
function Cursor({ x, y, name, color }: { x: number; y: number; name: string; color: string }) {
  return (
    <div
      className="pointer-events-none fixed z-[9999] flex items-start"
      style={{ left: x, top: y, transform: "translate(0, 0)" }}
    >
      {/* Arrow SVG — same shape Figma uses */}
      <svg
        width="18"
        height="22"
        viewBox="0 0 18 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
      >
        <path
          d="M0.5 0.5L0.5 17.5L4.5 13.5L7.5 20.5L10 19L7 12H13L0.5 0.5Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name pill */}
      <div
        className="ml-1 mt-3 px-2 py-0.5 rounded-full text-white text-[11px] font-semibold whitespace-nowrap select-none"
        style={{
          background: color,
          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
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
