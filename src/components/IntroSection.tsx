import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { PALETTE } from "@/app/constants";
import { chunkArray } from "@/app/helpers";

const IntroSection = () => {
    const [theme, setTheme] = useState({
        bg: "#1a1a1a",
        fg: "#ffffff"
    })
    const wrapperRef = useRef<HTMLDivElement>(null);
    const circleRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<GSAPTimeline>(null);
    const clickCountRef = useRef(0);

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
            <div className="row flex justify-between items-between w-full">
                {row.map((word, j) => (
                    <div
                        key={`${i}-${j}`}
                        className="inline-block m-4 px-4 py-1 rounded-full cursor-pointer leading-tighter tracking-tight"
                        style={{ backgroundColor: colors[(i * chunks[0].length + j) % colors.length] }}
                    >
                        {word}
                    </div>
                ))} 
            </div>
        ));
    }, [])

    // useEffect(() => {

    //     const handleClick = (e: MouseEvent) => {
    //         const { clientX, clientY } = e;
    //         const el      = circleRef.current;
    //         const wrapper = wrapperRef.current;
    //         if (!el || !wrapper) return;
    //         const radius  = el.offsetWidth / 2;

    //         // Position circle centred on click (natural/unscaled size)
    //         const x = clientX - radius;
    //         const y = clientY - radius;

    //         // Find the farthest corner of the wrapper from the click point —
    //         // the circle must reach it to fully cover the section.
    //         const rect = wrapper.getBoundingClientRect();
    //         const maxDist = Math.max(
    //             Math.hypot(clientX - rect.left,  clientY - rect.top),
    //             Math.hypot(clientX - rect.right, clientY - rect.top),
    //             Math.hypot(clientX - rect.left,  clientY - rect.bottom),
    //             Math.hypot(clientX - rect.right, clientY - rect.bottom),
    //         );
    //         const targetScale = maxDist / radius;

    //         const color = PALETTE[clickCountRef.current % PALETTE.length];
    //         clickCountRef.current++;

    //         let hasSwitchedTheme = false;

    //         animationRef.current?.kill();

    //         animationRef.current = gsap.timeline({
    //             onComplete: () => {
    //                 setTheme(prev => ({
    //                     bg: color,
    //                     fg: prev.fg === "#ffffff" ? "#1a1a1a" : "#ffffff"
    //                 }));
    //             }
    //         })
    //             .set(el, { x, y, scale: 0, backgroundColor: color })
    //             .to(el, {
    //                 scale: targetScale,
    //                 duration: 1,
    //                 ease: "expo.inOut",
    //                 onUpdate() {
    //                     // Derive progress from the live scale value — avoids casting 'this'
    //                     const currentScale = gsap.getProperty(el, 'scale') as number;
    //                     if (currentScale / targetScale > 0.5 && !hasSwitchedTheme) {
    //                         hasSwitchedTheme = true;
    //                         setTheme(prev => ({
    //                             bg: prev.bg,
    //                             fg: prev.fg === "#ffffff" ? "#1a1a1a" : "#ffffff"
    //                         }));
    //                     }
    //                 }
    //             });
    //     }


    //     window.addEventListener("click", handleClick);
    // }, [])


    return (
        <div className="w-screen h-screen font-mono text-6xl" style={{ backgroundColor: theme.bg, color: theme.bg }} ref={wrapperRef}>
            <div className="flex flex-col items-center justify-center h-full max-w-200 mx-auto">{pills}</div>
        </div>
    )
}

export default IntroSection;