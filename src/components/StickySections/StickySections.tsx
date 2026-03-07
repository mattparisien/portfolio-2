'use client';
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { PALETTE } from "@/app/constants";
import { isMetaTrue } from "@/app/helpers";
import type { MediaItem } from "@/types/media";

// Re-export the canonical type under the legacy alias so existing imports keep working
export type { MediaItem as MediaGridItem };

// Number of sections to keep rendered before and after the current viewport section.
// Increasing these values improves visual continuity at the cost of DOM size.
const SCROLL_BUFFER_BEFORE = 3;
const SCROLL_BUFFER_AFTER = 2;

interface MediaGridProps {
    items: MediaItem[];
    isActive: boolean;
}

/** Returns the inline styles shared by both <video> and <img> media elements. */
function getMediaStyles(item: MediaItem): React.CSSProperties {
    const fullScreen = isMetaTrue(item.meta?.isFullScreen);
    return {
        backfaceVisibility: "hidden",
        transform: "translateZ(0)",
        width: fullScreen ? "100%" : "auto",
        height: fullScreen ? "100%" : "auto",
        maxWidth: fullScreen ? "100%" : "90vw",
        maxHeight: fullScreen ? "100%" : "90vh",
    };
}

const StickySections = ({ items }: MediaGridProps) => {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 6 });
    const [currentSection, setCurrentSection] = useState(0);

    const sectionRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

    const addToRefs = (el: HTMLDivElement | null) => {
        if (el) {
            const ref = { current: el };
            if (!sectionRefs.current.find((r) => r.current === el)) {
                sectionRefs.current.push(ref);
            }
        }
    };

    useEffect(() => {
        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const vh = window.innerHeight;
                const scrollY = window.scrollY;

                const current = Math.floor(scrollY / vh);

                let start = Math.max(0, current - SCROLL_BUFFER_BEFORE);
                const end = Math.min(items.length, current + SCROLL_BUFFER_AFTER + 1);

                // If any section in or near the visible range removes its background
                // (transparent overlay), render from the start so there is always a
                // coloured section visible underneath.
                for (let i = Math.max(0, current - 1); i <= current + 2 && i < items.length; i++) {
                    if (isMetaTrue(items[i]?.meta?.removeBackground)) {
                        start = 0;
                        break;
                    }
                }

                setVisibleRange({ start, end });
                setCurrentSection(current);

                ticking = false;
            });
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll(); // set initial state

        return () => {
            window.removeEventListener("scroll", onScroll);
        };
    }, [items]);

    useEffect(() => {
        videoRefs.current.forEach((video, index) => {
            if (index === currentSection) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, [currentSection]);

    return (
        <div className="pointer-events-none" ref={scrollContainerRef}>
            <div className="relative top-0 left-0 w-screen">
                {/* Initial spacer to push the first section below the viewport */}
                <div className="h-screen pointer-events-none" />

                {items.map((item, actualIndex) => {
                    const isInRange =
                        actualIndex >= visibleRange.start &&
                        actualIndex < visibleRange.end;
                    const bgColor = isMetaTrue(item.meta?.removeBackground)
                        ? "transparent"
                        : PALETTE[actualIndex % PALETTE.length];

                    if (!isInRange) {
                        return (
                            <div
                                key={actualIndex}
                                className="sticky left-0 top-0 h-screen w-screen"
                                style={{ backgroundColor: bgColor, zIndex: actualIndex }}
                            />
                        );
                    }

                    const isFullScreen = isMetaTrue(item.meta?.isFullScreen);
                    const mediaStyles = getMediaStyles(item);

                    return (
                        <div
                            key={actualIndex}
                            className="sticky left-0 top-0 w-screen h-screen flex items-center justify-center rounded-t-xl pointer-events-auto relative"
                            ref={addToRefs}
                            style={{ backgroundColor: bgColor, zIndex: actualIndex }}
                        >
                            <div
                                className={classNames("rounded-md overflow-hidden inline-flex", {
                                    "w-full h-full": isFullScreen,
                                })}
                                style={{
                                    width: isFullScreen ? "100%" : "auto",
                                    height: isFullScreen ? "100%" : "auto",
                                    maxWidth: isFullScreen ? "100%" : "90vw",
                                    maxHeight: isFullScreen ? "100%" : "90vh",
                                    transform: `rotate(${item.meta?.rotate ?? 0}deg)`,
                                }}
                            >
                                {item.type === "video" ? (
                                    <video
                                        ref={(el) => {
                                            if (el) {
                                                videoRefs.current.set(actualIndex, el);
                                            } else {
                                                videoRefs.current.delete(actualIndex);
                                            }
                                        }}
                                        src={item.url}
                                        className={classNames({
                                            "w-full h-full object-cover": isFullScreen,
                                        })}
                                        loop
                                        muted
                                        playsInline
                                        style={mediaStyles}
                                    />
                                ) : (
                                    <img
                                        src={item.url}
                                        className={classNames({
                                            "w-full h-full object-cover": isFullScreen,
                                        })}
                                        alt=""
                                        loading={actualIndex < 3 ? "eager" : "lazy"}
                                        decoding="async"
                                        style={mediaStyles}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StickySections;
