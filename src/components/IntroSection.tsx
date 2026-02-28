import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { PALETTE } from "@/app/constants";

const IntroSection = () => {
    const [theme, setTheme] = useState({
        bg: "#1a1a1a",
        fg: "#ffffff"
    })
    const wrapperRef = useRef<HTMLDivElement>(null);
    const circleRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<GSAPTimeline>(null);
    const clickCountRef = useRef(0);

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
        <div className="w-screen h-screen bg-black font-mono text-white text-6xl">Matthew Parisien (1997) is a software developer and visual artist working in Montreal, Quebec.</div>
    )
}

export default IntroSection;