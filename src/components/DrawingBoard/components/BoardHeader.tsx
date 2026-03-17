"use client";

interface BoardHeaderProps {
  isSyncing?: boolean;
}

export default function BoardHeader({ isSyncing: _ }: BoardHeaderProps) {
  return (
    <div
      className="absolute top-0 left-0 p-2 rounded-full flex items-center gap-2 z-[400] select-none"
    >
      <div className="font-heading text-8xl">Crumb</div>
    </div>
  );
}
