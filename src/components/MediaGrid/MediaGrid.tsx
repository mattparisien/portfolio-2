'use client';
import { MediaItem } from "@/app/page";
import { useWindowWidth } from "@/app/hooks/useWindowWidth";
import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { shuffle } from "lodash";
import gsap from "gsap";
import { useInView } from "@/app/hooks/useInView";

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

const MediaGrid = ({ items, isActive }: MediaGridProps) => {


    const [isReady, setIsReady] = useState<boolean>(false);
    const windowWidth = useWindowWidth();


    const GRID_ITEM_COUNT = 4;
    const GRID_ITEM_WIDTH = (windowWidth / GRID_ITEM_COUNT).toFixed(2);
    const ROW_COUNT = Math.ceil((items?.length || 0) / GRID_ITEM_COUNT)
    const ROW_GAP = 30; // in rem
    const COL_GAP = 30; // in rem

    const imgRefs = useRef<React.RefObject<HTMLDivElement>[]>([]);
    const hasAnimated = useRef<boolean>(false);
    const isIntroComplete = useRef<boolean>(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const inViewStates = useInView(imgRefs.current, {
        threshold: 0.5,
        triggerOnce: true,
    })

    const inViewItems = useMemo(() => {
        return imgRefs.current.filter((x, i) => inViewStates[i]);
    }, [inViewStates])

    const addToRefs = (el: HTMLDivElement | null) => {
        if (el) {
            const ref = { current: el };
            if (!imgRefs.current.find(r => r.current === el)) {
                imgRefs.current.push(ref);
            }
        }
    }


    useEffect(() => {
        if (isActive && imgRefs.current?.length && imgRefs.current.length === items.length && !hasAnimated.current) {
            hasAnimated.current = true;
            const masterTl = gsap.timeline({ paused: true });
            const introTl = gsap.timeline({ paused: true });
            const placementTl = gsap.timeline({ paused: true });
            const inViewItems = imgRefs.current.filter((x, i) => inViewStates[i]);

            [...shuffle(inViewItems)].forEach((ref, idx) => {
                const img = ref.current;
                if (!img) return;

                const rect = img.getBoundingClientRect();
                const { height, width, top, left } = rect;

                const overlay = img.querySelector(".overlay") as HTMLDivElement;
                const overlayRect = overlay?.getBoundingClientRect();
                const overlayWidth = overlayRect?.width || width;
                const overlayHeight = overlayRect?.height || height;

                // Scale x and y of overlay so its a perfect square
                // We want the larger dimension to determine the square size
                const maxDimension = Math.max(overlayWidth, overlayHeight);
                const sX = maxDimension / overlayWidth;
                const sY = maxDimension / overlayHeight;

                const tlIntro = () => {
                    return gsap.timeline().from(overlay, {
                        scale: 0,
                        transformOrigin: "center center",
                        ease: "expo.inOut",
                        duration: 0.7,
                        onComplete: () => {
                            img.querySelector("img")?.classList.remove("opacity-0");
                            gsap.to(overlay, {
                                opacity: 0,
                                duration: 0.4,
                                onComplete: () => {
                                    gsap.set(overlay, { display: "none" });
                                }
                            })

                        }
                    })

                }



                introTl.add(tlIntro(), 0.04 * idx)
            })

            setIsReady(true);
            // make sure introTl starts at 0
            masterTl.add(introTl.play(), 0);

            // then placement AFTER intro
            masterTl.add(placementTl, ">");

            masterTl.play();
            isIntroComplete.current = true;
        }
    }, [windowWidth, isActive, items.length, inViewStates])

    useEffect(() => {
        if (isIntroComplete.current && inViewItems.length) {
            inViewItems.forEach((ref) => {
                const img = ref.current;
                if (!img) return;

                const overlay = img.querySelector(".overlay") as HTMLDivElement;
                if (!overlay) return;
                img.querySelector("img")?.classList.remove("opacity-0");
                gsap.to(overlay, {
                    opacity: 0,
                    duration: 0.4,
                    delay: 0.2,
                    onComplete: () => {
                        gsap.set(overlay, { display: "none" });
                    }
                })
            })
        }
    }, [inViewItems])


    return <div ref={scrollContainerRef} className={classNames("fixed top-0 left-0 h-full overflow-scroll left-0 w-screen h-screen", {
        "pointer-events-none": !isActive,
    })} >
        <div className={classNames("flex flex-col", {
            "opacity-0 ": !isReady
        })} style={{
            gap: ROW_GAP + "px"
        }} >
            {[...Array(ROW_COUNT)].map((row, i) => (
                <div className="w-full flex" key={i} style={{
                    height: GRID_ITEM_WIDTH + "px",
                    gap: COL_GAP + "px"
                }}>
                    {[...Array(GRID_ITEM_COUNT)].map((item, idx) => {

                        const img = items[i * GRID_ITEM_COUNT + idx];
                        if (!img) return <div key={idx} style={{
                            width: GRID_ITEM_WIDTH + "px",
                            backgroundColor: idx % 2 === 0 ? (i % 2 === 0 ? "white" : "black") : (i % 2 === 0 ? "black" : "white")
                        }}></div>;

                        return (
                            <div key={idx} style={{
                                width: GRID_ITEM_WIDTH + "px",
                                // backgroundColor: idx % 2 === 0 ? (i % 2 === 0 ? "white" : "black") : (i % 2 === 0 ? "black" : "white")
                            }}>
                                <div className="w-full h-full flex items-center justify-center relative" data-img-width={img?.width} data-img-height={img?.height} data-img-aspect={img?.aspectRatio?.toFixed(2)} ref={addToRefs}>

                                    <div className={classNames("object-cover relative", {
                                        "w-full": img?.aspectRatio && img.aspectRatio >= 1,
                                        "h-full": img?.aspectRatio && img.aspectRatio < 1,

                                    })}>
                                        <div className="overlay absolute top-0 left-0 w-full h-full z-10 rounded-md" style={{
                                            backgroundColor: PALETTE[(i * GRID_ITEM_COUNT + idx) % PALETTE.length],
                                        }}></div>
                                        <img src={img?.url} alt="" className={classNames("opacity-0", {
                                            "w-full": img?.aspectRatio && img.aspectRatio >= 1,
                                            "h-full": img?.aspectRatio && img.aspectRatio < 1,

                                        })} />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    </div>;
}

export default MediaGrid;