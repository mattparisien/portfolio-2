'use client';
import { MediaItem } from "@/app/page";
import classNames from "classnames";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { PALETTE } from "@/app/constants";

gsap.registerPlugin(ScrollTrigger);

interface MediaGridProps {
    items: MediaGridItem[];
    isActive: boolean;
}

export type MediaGridItem = MediaItem & {
    width: number | null;
    height: number | null;
    aspectRatio: number | null;
    meta?: {
        isFullScreen?: "true" | "false";
        removeBackground?: "true" | "false";
        rotate?: string;

    }
};


const StickySections = ({ items }: MediaGridProps) => {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 6 });

    const sectionRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const addToRefs = (el: HTMLDivElement | null) => {
        if (el) {
            const ref = { current: el };
            if (!sectionRefs.current.find(r => r.current === el)) {
                sectionRefs.current.push(ref);
            }
        }
    }

    useEffect(() => {
        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const vh = window.innerHeight;
                const scrollY = window.scrollY;

                // Calculate which sections should be visible
                const currentSection = Math.floor(scrollY / vh);
                const bufferBefore = 2; // Render 2 sections before
                const bufferAfter = 3; // Render 3 sections after

                let start = Math.max(0, currentSection - bufferBefore);
                const end = Math.min(items.length, currentSection + bufferAfter + 1);

                // Check if any section in or near the visible range has removeBackground
                // If so, keep rendering from the beginning to ensure there's always a background
                // Check from current section up to 2 sections ahead
                for (let i = Math.max(0, currentSection - 1); i <= currentSection + 2 && i < items.length; i++) {
                    if (items[i]?.meta?.removeBackground === "true") {
                        start = 0;
                        break;
                    }
                }

                setVisibleRange({ start, end });

                ticking = false;
            });
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll(); // Initial call

        return () => {
            window.removeEventListener("scroll", onScroll);
        };
    }, [items]);

    const visibleItems = items.slice(visibleRange.start, visibleRange.end);

    return <div
        className="w-screen min-h-screen absolute top-0 left-0"
        ref={scrollContainerRef}
    >
        <div className="relative top-0 left-0 w-screen">
            {/* Initial spacer to push first section below viewport */}
            <div className="h-screen" />
            
            {/* Spacer for sections before visible range */}
            {visibleRange.start > 0 && (
                <div style={{ height: `${visibleRange.start * 100}vh` }} />
            )}

            {visibleItems.map((item, i) => {
                const actualIndex = visibleRange.start + i;
                return (
                    <div
                        key={actualIndex}
                        className="sticky left-0 top-0 w-screen h-screen flex items-center justify-center rounded-t-xl pointer-events-all"
                        ref={addToRefs}
                        style={{
                            backgroundColor: item.meta?.removeBackground === "true" ? "transparent" : PALETTE[actualIndex % PALETTE.length],
                            zIndex: actualIndex,

                        }}
                    >
                        <div className={classNames("rounded-md overflow-hidden inline-flex", {
                            "w-full h-full": item.meta?.isFullScreen == "true",
                        })} style={{
                            transform: `rotate(${item.meta?.rotate ? item.meta.rotate : 0}deg)`,
                        }}>
                            {item.type === 'video' ? (
                                <video
                                    src={item.url}
                                    className={classNames("", {
                                        "max-w-[90vw] max-h-[90vh] object-contain": !item.meta?.isFullScreen || item.meta?.isFullScreen == "false",
                                        "w-full h-full object-cover": item.meta?.isFullScreen == "true",
                                    })}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    style={{
                                        backfaceVisibility: "hidden",
                                        transform: "translateZ(0)",
                                    }}
                                />
                            ) : (
                                <img
                                    src={item.url}
                                    className={classNames("", {
                                        "max-w-[90vw] max-h-[90vh] object-contain": !item.meta?.isFullScreen || item.meta?.isFullScreen == "false",
                                        "w-full h-full object-cover": item.meta?.isFullScreen == "true",
                                    })}
                                    alt=""
                                    loading={actualIndex < 3 ? "eager" : "lazy"}
                                    decoding="async"
                                    style={{
                                        backfaceVisibility: "hidden",
                                        transform: "translateZ(0)",
                                    }}
                                />
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Spacer for sections after visible range */}
            {visibleRange.end < items.length && (
                <div style={{ height: `${(items.length - visibleRange.end) * 100}vh` }} />
            )}
        </div>
    </div>;
}

export default StickySections;