"use client";

interface HeaderProps {
    isSyncing?: boolean;
}

export default function Header({ isSyncing: _ }: HeaderProps) {
    return (
        <div
            className="absolute top-appBounds left-0 sm:left-1/2 sm:-translate-x-1/2 rounded-full flex items-center z-[400] select-none"
        >
            <div className="font-heading text-5xl mix-blend-exclusion md:text-6xl leading-[0.75] tracking-tight text-fg" id="header-logo">Crumb</div>
        </div>
    );
}
