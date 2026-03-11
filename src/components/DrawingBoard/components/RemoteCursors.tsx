"use client";

import { useRef } from "react";
import { useOthers } from "@/liveblocks.config";

/** Convert canvas world coords → local screen coords using the local viewport transform. */
function worldToScreen(wx: number, wy: number, vpt: number[]): { x: number; y: number } {
  return {
    x: wx * vpt[0] + vpt[4],
    y: wy * vpt[3] + vpt[5],
  };
}

interface CachedCursor {
  x: number;
  y: number;
  name: string;
  color: string;
}

/** Figma-style cursor: sharp arrow + rounded-rect name label. */
function Cursor({ x, y, name, color }: { x: number; y: number; name: string; color: string }) {
  return (
    <div
      className="pointer-events-none fixed z-[100]"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${x}px, ${y}px)`,
        willChange: "transform",
      }}
    >
      {/* Custom cursor arrow */}
      <svg
        width="13"
        height="15"
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

      {/* Name label */}
      <div
        className="absolute text-white font-semibold select-none"
        style={{
          top: 18,
          left: 12,
          background: color,
          borderRadius: 6,
          padding: "3px 8px",
          fontSize: 13,
          lineHeight: "18px",
          letterSpacing: "0.01em",
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>
    </div>
  );
}

export default function RemoteCursors({ vpt }: { vpt: number[] }) {
  const others = useOthers();

  // Cache keeps the last known position for each remote user.
  // A cursor is only removed when the user fully leaves the room (disappears
  // from `others`), NOT when their cursor becomes null (which happens whenever
  // they move their mouse off screen or the connection briefly resets).
  const cache = useRef(new Map<number, CachedCursor>());

  // Sync cache on every render (triggered by useOthers reactivity):
  // – remove users who have fully left the room
  // – update positions only when cursor data is non-null (preserves last
  //   known position when a user temporarily clears their cursor)
  const activeIds = new Set(others.map((o) => o.connectionId));
  for (const id of cache.current.keys()) {
    if (!activeIds.has(id)) cache.current.delete(id);
  }
  for (const { connectionId, presence } of others) {
    if (presence.cursor) {
      cache.current.set(connectionId, {
        x: presence.cursor.x,
        y: presence.cursor.y,
        name: presence.name,
        color: presence.color,
      });
    }
  }

  return (
    <>
      {[...cache.current.entries()].map(([connectionId, { x: wx, y: wy, name, color }]) => {
        const { x, y } = worldToScreen(wx, wy, vpt);
        return (
          <Cursor
            key={connectionId}
            x={x}
            y={y}
            name={name}
            color={color}
          />
        );
      })}
    </>
  );
}
