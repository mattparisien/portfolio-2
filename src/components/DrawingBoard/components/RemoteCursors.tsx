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
      {/* Custom cursor arrow */}
      <svg
        width="20"
        height="22"
        viewBox="0 0 317 354"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <path
          d="M0.222591 12C-1.53354 3.60665 7.45159 -2.92141 14.8914 1.34245L311.358 171.251C318.902 175.574 317.649 186.816 309.339 189.372L165.447 233.635C163.219 234.321 161.303 235.767 160.033 237.723L88.0181 348.658C83.1885 356.097 71.7717 353.964 69.9552 345.282L0.222591 12Z"
          fill={color}
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
