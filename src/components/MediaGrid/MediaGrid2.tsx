'use client';
import { useWindowWidth } from "@/app/hooks/useWindowWidth";
import { MediaItem } from "@/app/page";
import classNames from "classnames";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

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

    // useEffect(() => {
    //     if (!hasAnimated.current && sectionRefs.current.length && sectionRefs.current.length === items.length && isActive) {
    //         hasAnimated.current = true;

    //         gsap.set(scrollContainerRef.current, { opacity: 1 });
    //         gsap.set(sectionRefs.current.slice(1).map(x => x.current), { y: "100%" })
    //         gsap.set(sectionRefs.current[0].current, { scale: 0 });
    //         gsap.set(sectionRefs.current[0].current.querySelector("img"), { opacity: 0 })

    //         gsap.timeline().to(sectionRefs.current[0].current, {
    //             scale: 1,
    //             duration: 1,
    //             ease: "expo.inOut",

    //         }).to(sectionRefs.current[0].current.querySelector("img"), {
    //             opacity: 1,
    //             duration: 0.8,

    //         }, "-=0.2");

    //         let ticking = false;
    //         const onScroll = () => {
    //             if (ticking) return;
    //             ticking = true;

    //             requestAnimationFrame(() => {
    //                 const vh = window.innerHeight;
    //                 const scrollY = window.scrollY;

    //                 sectionRefs.current.slice(1).forEach((ref, i) => {
    //                     const sectionIndex = i + 1; // Account for skipping first section
    //                     const start = vh * sectionIndex;
    //                     let scrollProgress = (scrollY - start) / vh;

    //                     if (scrollProgress < 0) scrollProgress = 0;
    //                     if (scrollProgress > 1) scrollProgress = 1;

    //                     ref.current.style.transform = `translateY(${100 * (1 - scrollProgress)}%)`;
    //                 });

    //                 ticking = false;
    //             });
    //         };

    //         window.addEventListener("scroll", onScroll, { passive: true });
    //         onScroll(); // Initial call

    //         return () => {
    //             window.removeEventListener("scroll", onScroll);
    //         };
    //     }

    //     return () => {
    //         ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    //     };
    // }, [items.length, isActive])



    return <div
        className={classNames("w-screen min-h-screen absolute top-0 left-0 ", {
            "pointer-events-none": !isActive
        })}
        ref={scrollContainerRef}
    >
        <div className="relative top-0 left-0 w-screen">
            {items.map((item, index) => (
                <div key={index} className="sticky left-0 top-0 w-screen h-screen flex items-center justify-center rounded-t-xl"
                    ref={addToRefs}
                    style={{
                        backgroundColor: PALETTE[index % PALETTE.length],
                    }}>
                    <img src={item.url} alt="" className={classNames("rounded-md overflow-hidden w-full h-full", {
                        "object-contain scale-[0.8]": !item.meta?.isFullScreen,
                        "object-cover": item.meta?.isFullScreen,
                    })}
                        loading={index < 3 ? "eager" : "lazy"}
                        decoding="async"

                        style={{
                            backfaceVisibility: "hidden", transform: "translateZ(0)",
                        }}
                    />
                </div>

            ))}
            <div className="spacer" style={{
                height: 100 * items.length + "vh",
            }}></div>
        </div>
    </div>;
}

export default MediaGrid2;