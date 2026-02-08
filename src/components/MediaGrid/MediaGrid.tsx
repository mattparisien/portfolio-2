'use client';
import { MediaItem } from "@/app/page";
import { useWindowWidth } from "@/app/hooks/useWindowWidth";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

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

    const imgRefs = useRef<(HTMLDivElement | null)[]>([]);
    const hasAnimated = useRef<boolean>(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const addToRefs = (el: HTMLDivElement) => {
        if (el && !imgRefs.current.includes(el)) {
            imgRefs.current.push(el);
        }
    }

    useEffect(() => {
        if (isActive && imgRefs.current?.length && imgRefs.current.length === items.length && !hasAnimated.current) {
            hasAnimated.current = true;
            const masterTl = gsap.timeline({ paused: true });
            const introTl = gsap.timeline({ paused: true });
            const placementTl = gsap.timeline({ paused: true });
            imgRefs.current.forEach((img, idx) => {
                const { height, width, top, left } = img?.getBoundingClientRect();

                const txCenter = windowWidth / 2 - width / 2 - left;
                const tyCenter = window.innerHeight / 2 - height / 2 - top;
                const txBottom = txCenter;
                const tyBottom = tyCenter + window.innerHeight / 2 + height / 2;

                const overlay = img?.querySelector(".overlay") as HTMLDivElement;
                const overlayRect = overlay?.getBoundingClientRect();
                const overlayWidth = overlayRect?.width || width;
                const overlayHeight = overlayRect?.height || height;

                // Scale x and y of overlay so its a perfect square
                // We want the larger dimension to determine the square size
                const maxDimension = Math.max(overlayWidth, overlayHeight);
                const sX = maxDimension / overlayWidth;
                const sY = maxDimension / overlayHeight;

                console.log('Overlay dimensions:', { overlayWidth, overlayHeight, sX, sY, maxDimension });

                const tlIntro = () => {
                    return gsap.timeline().from(overlay, {
                        scale: 0,
                        transformOrigin: "center center",
                        ease: "power3.inOut",
                        duration: 1,
                        onComplete: () => {
                            img?.querySelector("img")?.classList.remove("opacity-0");
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



                introTl.add(tlIntro(), 0.2 * idx + 1)
            })

            setIsReady(true);
            // make sure introTl starts at 0
            masterTl.add(introTl.play(), 0);

            // then placement AFTER intro
            masterTl.add(placementTl, ">");

            masterTl.play();
        }
    }, [windowWidth, isActive])

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