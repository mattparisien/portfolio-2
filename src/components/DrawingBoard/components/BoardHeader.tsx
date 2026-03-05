"use client";

interface BoardHeaderProps {
  isSyncing?: boolean;
}

export default function BoardHeader({ isSyncing }: BoardHeaderProps) {
  return (
    <div
      className="absolute top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm font-mono tracking-widest uppercase flex items-center gap-2 z-[200]"
      style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}
    >
      Queer Montréal ✦ Collective Board
      {isSyncing && (
        <span
          className="w-2 h-2 rounded-full bg-pink-400 animate-pulse inline-block"
          title="Loading board…"
        />
      )}
    </div>
  );
}
