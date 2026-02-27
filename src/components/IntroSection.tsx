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

    useEffect(() => {

        const handleClick = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const el      = circleRef.current;
            const wrapper = wrapperRef.current;
            if (!el || !wrapper) return;
            const rect   = wrapper.getBoundingClientRect();
            const radius = el.offsetWidth / 2;

            // Convert viewport click coords to coords relative to the wrapper's origin,
            // then centre the circle on the click point.
            const x = clientX - rect.left - radius;
            const y = clientY - rect.top  - radius;

            // Find the farthest corner of the wrapper from the click point —
            // the circle must reach it to fully cover the section.
            const maxDist = Math.max(
                Math.hypot(clientX - rect.left,  clientY - rect.top),
                Math.hypot(clientX - rect.right, clientY - rect.top),
                Math.hypot(clientX - rect.left,  clientY - rect.bottom),
                Math.hypot(clientX - rect.right, clientY - rect.bottom),
            );
            const targetScale = maxDist / radius;

            const color = PALETTE[clickCountRef.current % PALETTE.length];
            clickCountRef.current++;

            let hasSwitchedTheme = false;

            animationRef.current?.kill();

            animationRef.current = gsap.timeline({
                onComplete: () => {
                    setTheme(prev => ({
                        bg: color,
                        fg: prev.fg
                    }));
                }
            })
                .set(el, { x, y, scale: 0, backgroundColor: color })
                .to(el, {
                    scale: targetScale,
                    duration: 0.7,
                    ease: "power4.inOut",
                    onUpdate() {
                        // Derive progress from the live scale value — avoids casting 'this'
                        const currentScale = gsap.getProperty(el, 'scale') as number;
                        if (currentScale / targetScale > 0.4 && !hasSwitchedTheme) {
                            hasSwitchedTheme = true;
                            setTheme(prev => ({
                                bg: prev.bg,
                                fg: prev.fg === "#ffffff" ? "#1a1a1a" : "#ffffff"
                            }));
                        }
                    }
                });
        }


        window.addEventListener("click", handleClick);
    }, [])


    return (
        <div className="font-display cursor-pointer transition-color duration-300 overflow-hidden relative text-6xl leading-normal flex flex-col justify-between items-start w-screen h-[100dvh] fixed top-0 left-0 sm:px-8 sm:py-5 px-4 py-3" style={{
            backgroundColor: theme.bg,
            color: theme.fg
        }}
            ref={wrapperRef}
        >
            <p className="z-20">Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p>
            <div className="circle z-10 w-10 h-10 absolute top-0 left-0 rounded-full" ref={circleRef}></div>
        </div>
    )
}

export default IntroSection;