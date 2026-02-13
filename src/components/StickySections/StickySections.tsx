'use client';
import { MediaItem } from "@/app/page";
import classNames from "classnames";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { PALETTE } from "@/app/constants";
import { useScrollHeight } from "@/app/hooks/useScrollHeight";

gsap.registerPlugin(ScrollTrigger);

// Function to darken a hex color
function darkenHexColor(hex: string, percent: number = 30): string {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse RGB values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Darken by reducing each component
    const factor = (100 - percent) / 100;
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);

    // Convert back to hex
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

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
        context?: string;
        transform?: "scale"
    }
};


const StickySections = ({ items }: MediaGridProps) => {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 6 });

    const sectionRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollHeight = useScrollHeight();

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

                console.log('setting visible range...', start, end);
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

    return <div
        className="pointer-events-none"
        ref={scrollContainerRef}
    >
        <div className="relative top-0 left-0 w-screen">
            {/* Initial spacer to push first section below viewport */}
            <div className="h-screen pointer-events-none" />

            {items.map((item, actualIndex) => {
                // Check if this item should be rendered
                const isInRange = actualIndex >= visibleRange.start && actualIndex < visibleRange.end;
                const bgColor = item.meta?.removeBackground === "true" ? "transparent" : PALETTE[actualIndex % PALETTE.length];

                return (
                    <div
                        key={actualIndex}
                        className="sticky left-0 top-0 w-screen h-screen flex items-center justify-center rounded-t-xl pointer-events-auto relative"
                        ref={addToRefs}
                        style={{
                            backgroundColor: bgColor,
                            zIndex: actualIndex,
                            visibility: isInRange ? 'visible' : 'hidden',
                            opacity: isInRange ? 1 : 0,
                        }}
                    >

                            <div className={classNames("rounded-md overflow-hidden inline-flex", {
                                "w-full h-full": item.meta?.isFullScreen == "true",
                            })} style={{
                                width: item.meta?.isFullScreen === "true" ? "100%" : "auto",
                                height: item.meta?.isFullScreen === "true" ? "100%" : "auto",
                                maxWidth: item.meta?.isFullScreen === "true" ? "100%" : '90vw',
                                maxHeight: item.meta?.isFullScreen === "true" ? "100%" : '90vh',
                                transform: `rotate(${item.meta?.rotate ? item.meta.rotate : 0}deg)`,
                            }}>
                                {item.type === 'video' ? (
                                    <video
                                        src={item.url}
                                        className={classNames({
                                            "w-full h-full object-cover": item.meta?.isFullScreen == "true",
                                        })}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        style={{
                                            backfaceVisibility: "hidden",
                                            transform: "translateZ(0)",
                                            maxWidth: item.meta?.isFullScreen === "true" ? "100%" : "90vw",
                                            maxHeight: item.meta?.isFullScreen === "true" ? "100%" : "90vh",
                                            width: item.meta?.isFullScreen === "true" ? "100%" : "auto",
                                            height: item.meta?.isFullScreen === "true" ? "100%" : "auto",
                                        }}
                                    />
                                ) : (
                                    <img
                                        src={item.url}
                                        className={classNames({
                                            "w-full h-full object-cover": item.meta?.isFullScreen == "true",
                                        })}
                                        alt=""
                                        loading={actualIndex < 3 ? "eager" : "lazy"}
                                        decoding="async"
                                        style={{
                                            backfaceVisibility: "hidden",
                                            transform: "translateZ(0)",
                                            maxWidth: item.meta?.isFullScreen === "true" ? "100%" : "90vw",
                                            maxHeight: item.meta?.isFullScreen === "true" ? "100%" : "90vh",
                                            width: item.meta?.isFullScreen === "true" ? "100%" : "auto",
                                            height: item.meta?.isFullScreen === "true" ? "100%" : "auto"
                                        }}
                                    />
                                )}

                            </div>
                            {/* <div className="context absolute left-0 bottom-0 p-3 text-3xl font-light" style={{
                                fontFamily: 'Freigeist, sans-serif',
                                color: textColor,
                                display: item.meta?.context ? 'block' : 'none',
                            }}>{item.meta?.context}</div> */}
                        </div>
                );
            })}
        </div>
    </div>;
}

export default StickySections;