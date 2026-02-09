'use client';
import { useWindowWidth } from "@/app/hooks/useWindowWidth";
import { MediaItem } from "@/app/page";
import classNames from "classnames";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { use, useEffect, useRef, useState } from "react";

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
        isFullScreen?: boolean;
    }
};

const PALETTE = [
    "#A0C1B5",
    "#AF3C3F",
    "#B597B0",
    "#198948",
    "#E2CEBB",
    "#AF9786",
    "#0281AD",
    "#B77F3E",
    "#CFC47B",
    "#7E6259",
    "#CB968E"
]

const MediaGrid2 = ({ items, isActive }: MediaGridProps) => {

    const hasAnimated = useRef<boolean>(false);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 5 });

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
                
                const start = Math.max(0, currentSection - bufferBefore);
                const end = Math.min(items.length, currentSection + bufferAfter + 1);
                
                setVisibleRange({ start, end });
                
                ticking = false;
            });
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll(); // Initial call

        return () => {
            window.removeEventListener("scroll", onScroll);
        };
    }, [items.length]);

    const visibleItems = items.slice(visibleRange.start, visibleRange.end);

    useEffect(() => {
        if (isActive && !hasAnimated.current && sectionRefs.current.length > 0) {
            hasAnimated.current = true;
            
            const firstSection = sectionRefs.current[0]?.current;
            if (firstSection) {
                // Set initial state immediately
                gsap.set(firstSection, { y: "100%" });
                gsap.set(firstSection.querySelector("img"), { opacity: 0 });
                gsap.set(scrollContainerRef.current, { opacity: 1 });
                
                // Animate in
                gsap.timeline().to(firstSection, { 
                    y: "0%",
                    opacity: 1,
                    duration: 1, 
                    ease: "circ.out" 
                })
                .to(firstSection.querySelector("img"), { 
                    opacity: 1, 
                    duration: 0.8, 
                    ease: "circ.out" 
                }), "-=0.5");
            }
        }
    }, [isActive, sectionRefs.current.length]);

    return <div
        className={classNames("w-screen min-h-screen absolute top-0 left-0 opacity-0", {
            "pointer-events-none": !isActive
        })}
        ref={scrollContainerRef}
    >
        <div className="relative top-0 left-0 w-screen">
            {/* Spacer for sections before visible range */}
            {visibleRange.start > 0 && (
                <div style={{ height: `${visibleRange.start * 100}vh` }} />
            )}
            
            {visibleItems.map((item, i) => {
                const actualIndex = visibleRange.start + i;
                return (
                    <div 
                        key={actualIndex} 
                        className="sticky left-0 top-0 w-screen h-screen flex items-center justify-center rounded-t-xl"
                        ref={addToRefs}
                        style={{
                            backgroundColor: PALETTE[actualIndex % PALETTE.length],
                            zIndex: actualIndex
                        }}
                    >
                        <img 
                            src={item.url} 
                            alt="" 
                            className={classNames("rounded-md overflow-hidden w-full h-full", {
                                "object-contain scale-[0.8]": !item.meta?.isFullScreen,
                                "object-cover": item.meta?.isFullScreen,
                            })}
                            loading={actualIndex < 3 ? "eager" : "lazy"}
                            decoding="async"
                            style={{
                                backfaceVisibility: "hidden", 
                                transform: "translateZ(0)",
                            }}
                        />
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

export default MediaGrid2;