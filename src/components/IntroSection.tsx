'use client';
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { PALETTE } from "@/app/constants";

// How many vh of scroll the reveal takes
const SCROLL_LENGTH_VH = 1;

const IntroSection = () => {
    // Back layer theme (driven by click ripple)
    const [theme, setTheme] = useState({ bg: "#1a1a1a", fg: "#ffffff" });

    const containerRef  = useRef<HTMLDivElement>(null); // outer fixed frame
    const backRef       = useRef<HTMLDivElement>(null); // back layer (click target)
    const frontRef      = useRef<HTMLDivElement>(null); // front layer (clip-path mask)
    const isDoneRef     = useRef(false);
    const circleRef     = useRef<HTMLDivElement>(null); // ripple circle on back layer
    const animationRef  = useRef<GSAPTimeline>(null);
    const clickCountRef = useRef(0);

    // --- Scroll-driven clip-path reveal ---
    useEffect(() => {
        const update = () => {
            const vh       = window.innerHeight;
            const scrollY  = window.scrollY;
            const progress = Math.min(1, Math.max(0, scrollY / (vh * SCROLL_LENGTH_VH)));
            // Radius grows from 0% (hidden) → 150% (fully covers screen)
            const radius = 150 * progress;
            if (frontRef.current) {
                frontRef.current.style.clipPath = `circle(${radius}% at 50% 50%)`;
            }
            // Once fully scrolled past, remove pointer events so the gallery is interactive
            if (containerRef.current) {
                const done = progress >= 1;
                if (done !== isDoneRef.current) {
                    isDoneRef.current = done;
                    containerRef.current.style.pointerEvents = done ? "none" : "auto";
                }
            }
        };
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        update();
        return () => {
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, []);

    // --- Click ripple on back layer ---
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const el      = circleRef.current;
            const wrapper = backRef.current;
            if (!el || !wrapper) return;

            const { clientX, clientY } = e;
            const rect   = wrapper.getBoundingClientRect();
            const radius = el.offsetWidth / 2;

            const x = clientX - rect.left - radius;
            const y = clientY - rect.top  - radius;

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
                onComplete: () => setTheme(prev => ({ bg: color, fg: prev.fg }))
            })
                .set(el, { x, y, scale: 0, backgroundColor: color })
                .to(el, {
                    scale: targetScale,
                    duration: 0.7,
                    ease: "power4.inOut",
                    onUpdate() {
                        const currentScale = gsap.getProperty(el, "scale") as number;
                        if (currentScale / targetScale > 0.4 && !hasSwitchedTheme) {
                            hasSwitchedTheme = true;
                            setTheme(prev => ({
                                bg: prev.bg,
                                fg: prev.fg === "#ffffff" ? "#1a1a1a" : "#ffffff"
                            }));
                        }
                    }
                });
        };

        const back = backRef.current;
        back?.addEventListener("click", handleClick);
        return () => back?.removeEventListener("click", handleClick);
    }, []);

    const sharedClasses =
        "font-display absolute inset-0 text-6xl leading-normal flex flex-col justify-between items-start sm:px-8 sm:py-5 px-4 py-3";

    return (
        <>
            {/* Scroll space — drives the clip-path reveal */}
            <div style={{ height: `${(SCROLL_LENGTH_VH + 1) * 100}vh` }} />

            {/* Fixed frame that holds both layers */}
            <div ref={containerRef} className="fixed top-0 left-0 w-screen h-screen overflow-hidden" style={{ zIndex: 100 }}>

                {/* ── Back layer: click ripple ── */}
                <div
                    ref={backRef}
                    className={`${sharedClasses} cursor-pointer overflow-hidden`}
                    style={{ backgroundColor: theme.bg, color: theme.fg }}
                >
                    <p className="z-20 relative">Back layer — click me</p>
                    {/* Ripple circle */}
                    <div className="circle z-10 w-10 h-10 absolute top-0 left-0 rounded-full" ref={circleRef} />
                </div>

                {/* ── Front layer: clip-path shrinks on scroll ── */}
                <div
                    ref={frontRef}
                    className={`${sharedClasses} pointer-events-none`}
                    style={{
                        backgroundColor: "#f5f0e8",
                        color: "#1a1a1a",
                        clipPath: "circle(0% at 50% 50%)",
                    }}
                >
                    <p className="z-20 relative">Front layer — scroll to reveal</p>
                </div>
            </div>
        </>
    );
};

export default IntroSection;