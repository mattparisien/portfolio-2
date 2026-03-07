"use client";

import { useState } from "react";
import { useOthers, useSelf } from "@/liveblocks.config";

function Avatar({
  name,
  color,
  isYou,
}: {
  name: string;
  color: string;
  isYou?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar circle */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold select-none cursor-default flex-shrink-0 transition-transform hover:scale-110"
        style={{
          background: color,
          boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px ${color}44`,
        }}
      >
        {initials}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-semibold text-white pointer-events-none z-10"
          style={{ background: color }}
        >
          {name}{isYou ? " (you)" : ""}
          {/* Arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
            style={{ borderTopColor: color }}
          />
        </div>
      )}
    </div>
  );
}

export default function ActiveUsers() {
  const others = useOthers();
  const self   = useSelf();

  const selfName  = (self?.presence as { name?: string } | null)?.name  ?? "You";
  const selfColor = (self?.presence as { color?: string } | null)?.color ?? "#888";

  const total = others.length + 1;

  return (
    <div
      className="absolute top-5 right-5 flex items-center gap-2 px-3 py-2 rounded-2xl z-[200]"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(14px)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      {/* Stacked avatars — others first, self last */}
      <div className="flex items-center">
        {others.map((other, idx) => {
          const name  = (other.presence as { name?: string }).name  ?? "User";
          const color = (other.presence as { color?: string }).color ?? "#888";
          return (
            <div
              key={other.connectionId}
              className="relative hover:z-50"
              style={{ marginLeft: idx === 0 ? 0 : -8, zIndex: idx + 1 }}
            >
              <Avatar name={name} color={color} />
            </div>
          );
        })}
        <div
          className="relative hover:z-50"
          style={{ marginLeft: others.length > 0 ? -8 : 0, zIndex: others.length + 1 }}
        >
          <Avatar name={selfName} color={selfColor} isYou />
        </div>
      </div>

      {/* Count badge */}
      <span className="text-[11px] font-semibold text-gray-500 tabular-nums select-none leading-none">
        {total} online
      </span>
    </div>
  );
}
