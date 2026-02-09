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


    const addToRefs = (el: HTMLDivElement | null) => {
        if (el) {
            const ref = { current: el };
            if (!sectionRefs.current.find(r => r.current === el)) {
                sectionRefs.current.push(ref);
            }
        }
    }

    useEffect(() => {
        if (!hasAnimated.current && sectionRefs.current.length && sectionRefs
            .current.length === items.length) {
            sectionRefs.current.forEach(section => {
                gsap.fromTo(section.current, {
                    y: "100%",

                    // scrollTrigger: {
                    //     trigger: section.current,
                    //     start: "top 80%",
                    // }
                }, {
                    y: 0,
                    duration: 1,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: section.current,
                        start: "top 80%",
                    }
                })
            })
        }
    }, [])



    return <div className={classNames("fixed top-0 left-0 w-screen h-screen overflow-scroll", {
        "pointer-events-none": !isActive,
    })} >
        <div className="relative w-full h-full">
            {items.map((item, index) => (
                <div key={index} className="absolute top-0 left-0 w-full h-full flex items-center justify-center"
                    ref={addToRefs}
                    style={{
                        backgroundColor: PALETTE[index % PALETTE.length],
                    }}>
                    <img src={item.url} alt={item.alt || `Media item ${index}`} className="max-w-screen max-h-screen scale-[0.7]" />
                </div>
            ))}
        </div>
    </div>;
}

export default MediaGrid2;