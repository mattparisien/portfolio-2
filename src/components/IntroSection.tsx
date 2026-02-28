import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { chunkArray } from "@/app/helpers";

const IntroSection = () => {
    const theme = { bg: "#1a1a1a", fg: "#ffffff" };
    const wrapperRef = useRef<HTMLDivElement>(null);

    const pills = useMemo(() => {
        const chunks = chunkArray(["Creative", "Developer", "Designer", "Thinker", "Maker", "Innovator"], 2);
        
        const colors = [
            "#AEF344",
            "#FE9800",
            "#AD8AFF",
            "#84C7FE",
            "#FFEDD3"
        ]
        return chunks.map((row, i) => (
            <div key={i} className="row flex justify-between items-between w-full">
                {row.map((word, j) => (
                    <div
                        key={`${i}-${j}`}
                        data-pill
                        className="inline-block m-4 px-4 py-1 rounded-full cursor-pointer leading-tighter tracking-tight"
                        style={{ backgroundColor: colors[(i * chunks[0].length + j) % colors.length] }}
                    >
                        {word}
                    </div>
                ))} 
            </div>
        ));
    }, [])

    useEffect(() => {
        if (!wrapperRef.current) return;

        const pillEls = gsap.utils.toArray<HTMLElement>(
            wrapperRef.current.querySelectorAll("[data-pill]")
        );

        const directions = [
            { x: -220, y: 0 },      // left
            { x: 220, y: 0 },       // right
            { x: 0, y: -180 },      // top
            { x: 0, y: 180 },       // bottom
            { x: -180, y: -180 },   // top-left
            { x: 180, y: 180 },     // bottom-right
        ];

        gsap.set(pillEls, { opacity: 0 });

        pillEls.forEach((pill, i) => {
            const { x, y } = directions[i % directions.length];
            gsap.fromTo(
                pill,
                { x, y, opacity: 0, scale: 0.75 },
                {
                    x: 0,
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 1.4,
                    ease: "expo.out",
                    delay: 0.1 + i * 0.08,
                }
            );
        });
    }, []);

    return (
        <div className="w-screen h-screen font-mono text-6xl" style={{ backgroundColor: theme.bg, color: theme.bg }} ref={wrapperRef}>
            <div className="flex flex-col items-center justify-center h-full max-w-200 mx-auto">{pills}</div>
        </div>
    )
}

export default IntroSection;