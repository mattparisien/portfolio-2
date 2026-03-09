"use client";

interface BoardHeaderProps {
  isSyncing?: boolean;
}

export default function BoardHeader({ isSyncing }: BoardHeaderProps) {
  return (
    <div
      className="absolute top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm font-mono tracking-widest uppercase flex items-center gap-2 z-[200] select-none"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      Collective Board
      {isSyncing && (
        <span
          title="Syncing board…"
          className="w-3.5 h-3.5 rounded-full border-2 border-pink-400 border-t-transparent animate-spin inline-block flex-shrink-0"
        />
      )}
    </div>
  );
}
