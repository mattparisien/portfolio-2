'use client';
import { MediaItem } from "@/types/media";
import { useEffect, useRef, useState, useCallback } from "react";
import { PALETTE } from "@/app/constants";
import classNames from "classnames";

// Items to keep rendered behind and ahead of the active panel
const KEEP_BEHIND = 2;
const KEEP_AHEAD  = 2; // total window = KEEP_BEHIND + 1 (active) + KEEP_AHEAD = 4

interface MediaGridProps {
    items: MediaGridItem[];
    isActive: boolean;
    /** Number of vh units already consumed by preceding sections. StickySections scroll math starts after this offset. */
    scrollOffsetVh?: number;
}

export type MediaGridItem = MediaItem & {
    width: number | null;
    height: number | null;
    aspectRatio: number | null;
    meta?: {
        isFullScreen?: "true" | "false";
        removeBackground?: "true" | "false";
        rotate?: string;
        context?: string;
        transform?: never;
    };
};

function applyPanelTransform(panel: HTMLDivElement, progress: number) {
    panel.style.transform = `translateY(${(1 - progress) * 100}%)`;
    panel.style.opacity   = '1';
}

function getInitialTransform(): string {
    return 'translateY(100%)';
}

const StickySections = ({ items, scrollOffsetVh = 0 }: MediaGridProps) => {
    // Map from global item index → DOM element (survives window shifts)
    const panelRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const itemsRef  = useRef(items);
    itemsRef.current = items;

    // Virtual window — which indices are currently mounted
    const initialEnd = Math.min(items.length - 1, KEEP_AHEAD);
    const [windowStart, setWindowStart] = useState(0);
    const [windowEnd,   setWindowEnd]   = useState(initialEnd);
    const windowRef = useRef({ start: 0, end: initialEnd });

    // Apply scroll-driven transforms to all currently mounted panels
    const updateTransforms = useCallback(() => {
        const vh      = window.innerHeight;
        const scrollY = window.scrollY;
        panelRefs.current.forEach((panel, i) => {
            const start    = (i + scrollOffsetVh) * vh;
            const end      = (i + scrollOffsetVh + 1) * vh;
            const progress = Math.min(1, Math.max(0, (scrollY - start) / (end - start)));
            applyPanelTransform(panel, progress);
        });
    }, [scrollOffsetVh]);

    // Re-apply transforms whenever the window changes so newly mounted panels
    // receive the correct position immediately (no frame of flash)
    useEffect(() => {
        updateTransforms();
    }, [windowStart, windowEnd, updateTransforms]);

    // Main scroll listener — moves the virtual window and drives animations
    useEffect(() => {
        if (!items || items.length === 0) return;

        const onScroll = () => {
            const vh         = window.innerHeight;
            const scrollY    = window.scrollY;
            const total      = itemsRef.current.length;
            const active     = Math.max(0, Math.min(total - 1, Math.floor((scrollY - scrollOffsetVh * vh) / vh)));
            const newStart   = Math.max(0, active - KEEP_BEHIND);
            const newEnd     = Math.min(total - 1, active + KEEP_AHEAD);

            if (newStart !== windowRef.current.start || newEnd !== windowRef.current.end) {
                windowRef.current = { start: newStart, end: newEnd };
                setWindowStart(newStart);
                setWindowEnd(newEnd);
            }

            updateTransforms();
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        onScroll();

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [items, updateTransforms, scrollOffsetVh]);

    return (
        <>
            {/* Provides scroll space: one vh per panel to slide in, plus one vh to view the last panel */}
            <div style={{ height: `${(items.length + 1) * 100}vh` }} />

            {items.slice(windowStart, windowEnd + 1).map((item, localI) => {
                const i         = windowStart + localI; // global index
                const bgColor = item.meta?.removeBackground === "true"
                    ? "transparent"
                    : PALETTE[i % PALETTE.length];

                return (
                    <div
                        key={i}
                        ref={el => {
                            if (el) panelRefs.current.set(i, el);
                            else    panelRefs.current.delete(i);
                        }}
                        className="flex items-center justify-center rounded-t-xl pointer-events-auto"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100vh',
                            zIndex: i + 1,
                            transform: getInitialTransform(),
                            opacity: 1,
                            transformOrigin: 'center center',
                            willChange: 'transform',
                            backgroundColor: bgColor,
                        }}
                    >
                        <div
                            className={classNames("rounded-md overflow-hidden inline-flex", {
                                "w-full h-full": item.meta?.isFullScreen === "true",
                            })}
                            style={{
                                width:     item.meta?.isFullScreen === "true" ? "100%" : "auto",
                                height:    item.meta?.isFullScreen === "true" ? "100%" : "auto",
                                maxWidth:  item.meta?.isFullScreen === "true" ? "100%" : "90vw",
                                maxHeight: item.meta?.isFullScreen === "true" ? "100%" : "90vh",
                                transform: `rotate(${item.meta?.rotate ?? 0}deg)`,
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={item.url}
                                alt=""
                                className={classNames({ "w-full h-full object-cover": item.meta?.isFullScreen === "true" })}
                                loading="eager"
                                decoding="async"
                                style={{
                                    backfaceVisibility: "hidden",
                                    transform:  "translateZ(0)",
                                    maxWidth:   item.meta?.isFullScreen === "true" ? "100%" : "90vw",
                                    maxHeight:  item.meta?.isFullScreen === "true" ? "100%" : "90vh",
                                    width:      item.meta?.isFullScreen === "true" ? "100%" : "auto",
                                    height:     item.meta?.isFullScreen === "true" ? "100%" : "auto",
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </>
    );
};

export default StickySections;

