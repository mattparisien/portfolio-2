'use client';
import { MediaItem } from "@/app/page";
import { useWindowWidth } from "@/app/hooks/useWindowWidth";
import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { shuffle } from "lodash";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useInView } from "@/app/hooks/useInView";

gsap.registerPlugin(ScrollTrigger);

interface MediaGridProps {
    items: MediaGridItem[];
    isActive: boolean;
}

export type MediaGridItem = MediaItem & {
    width: number | null;
    height: number | null;
    aspectRatio: number | null;
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


    const [isReady, setIsReady] = useState<boolean>(false);
    const windowWidth = useWindowWidth();
    const hasAnimated = useRef<boolean>(false);


    const GRID_ITEM_COUNT = 4;
    const GRID_ITEM_WIDTH = (windowWidth / GRID_ITEM_COUNT).toFixed(2);
    const ROW_COUNT = Math.ceil((items?.length || 0) / GRID_ITEM_COUNT)
    const ROW_GAP = 30; // in rem
    const COL_GAP = 30; // in rem

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
        if (!hasAnimated.current && sectionRefs.current.length && sectionRefs.current.length === items.length && scrollContainerRef.current) {
            hasAnimated.current = true;

            sectionRefs.current.forEach((section, i) => {
                
                ScrollTrigger.create({
                    trigger: section.current,
                    scroller: "body",
                    start: "top top",
                    end: "max", // Pin forever
                    pin: true,
                    pinSpacing: true, // Keep spacing so sections flow normally
                    markers: true,
                    onUpdate: (self) => {
                        console.log('updating!', self.progress)
                    }
                });
            });


        }




        return () => {
            ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        };
    }, [items.length, isActive])



    return <div 
        ref={scrollContainerRef}
        className={classNames("w-screen min-h-screen overflow-y-scroll", {
            "pointer-events-none": !isActive
        })
    }>
        {items.map((item, index) => (
            <div key={index} className="w-full h-screen flex items-center justify-center"
                ref={addToRefs}
                style={{
                    backgroundColor: PALETTE[index % PALETTE.length],
                    zIndex: index,
                }}>
                <img src={item.url} alt={item.alt || `Media item ${index}`} className="max-w-screen max-h-screen scale-[0.7]" />
            </div>
        ))}
        <div style={{ height: `${items.length * 100}vh` }}></div>
    </div>;
}

export default MediaGrid2;