"use client";

interface BoardHeaderProps {
  isSyncing?: boolean;
}

export default function BoardHeader({ isSyncing: _ }: BoardHeaderProps) {
  return (
    <div
      className="absolute top-appBounds left-appBounds rounded-full flex items-center gap-2 z-[400] select-none"
    >
      <div className="font-heading text-5xl lg:text-8xl leading-[0.8]">Crumb</div>
    </div>
  );
}
