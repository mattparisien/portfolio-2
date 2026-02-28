import { ReactNode, useEffect, useRef, useState } from "react";
import { getRandomArbitrary } from "@/app/helpers";
import gsap from "gsap";

const SHARED_TEXT = "Somewhere along the way, art history turned into software and software turned into product.";

const PALETTE = [
    {bg: "#00AF59", fg: "#000F00", text: SHARED_TEXT },
    {bg: "#FFD0E1", fg: "#000F00", text: SHARED_TEXT },
    {bg: "#D72D2C", fg: "#F2F0E5", text: SHARED_TEXT },
    {bg: "#FAFF00", fg: "#000F00", text: SHARED_TEXT },

    {bg: "#C8A3E1", fg: "#1E1C1F", text: SHARED_TEXT },
    {bg: "#252122", fg: "#F2F0E5", text: SHARED_TEXT },
    {bg: "white", fg: "#1542FA", text: SHARED_TEXT },
];

const IntroSection = () => {
    const wrapperRef   = useRef<HTMLDivElement>(null);
    const frontRef     = useRef<HTMLDivElement>(null);
    const backRef      = useRef<HTMLDivElement>(null);
    const currentIndex = useRef<number>(0);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        const front   = frontRef.current;
        const back    = backRef.current;
        if (!wrapper || !front || !back) return;

        // Initialise both layers — GSAP owns all visual props, React owns nothing
        const p0 = PALETTE[0];
        const p1 = PALETTE[1];
        gsap.set(front, { backgroundColor: p0.bg, color: p0.fg });
        gsap.set(back,  { backgroundColor: p1.bg, color: p1.fg, clipPath: "circle(0px at 50% 50%)" });
        front.textContent = p0.text;
        back.textContent  = p1.text;

        const handleClick = (e: MouseEvent) => {
            const idx     = ++currentIndex.current;
            const current = PALETTE[idx % PALETTE.length];
            const next    = PALETTE[(idx + 1) % PALETTE.length];

            const rect = wrapper.getBoundingClientRect();
            const cx   = e.clientX - rect.left;
            const cy   = e.clientY - rect.top;
            const maxR = Math.max(
                Math.hypot(cx,              cy),
                Math.hypot(cx - rect.width,  cy),
                Math.hypot(cx,              cy - rect.height),
                Math.hypot(cx - rect.width,  cy - rect.height),
            );

            // Prepare back layer synchronously before animation
            gsap.killTweensOf(back);
            gsap.set(back, {
                backgroundColor: current.bg,
                color: current.fg,
                clipPath: `circle(0px at ${cx}px ${cy}px)`,
            });
            back.textContent = current.text;

            gsap.to(back, {
                clipPath: `circle(${maxR}px at ${cx}px ${cy}px)`,
                duration: 0.8,
                ease: "expo.inOut",
                onComplete() {
                    // Bake into front synchronously, then reset back — all via GSAP, no React state
                    gsap.set(front, { backgroundColor: current.bg, color: current.fg });
                    front.textContent = current.text;
                    gsap.set(back, {
                        backgroundColor: next.bg,
                        color: next.fg,
                        clipPath: "circle(0px at 50% 50%)",
                    });
                    back.textContent = next.text;
                },
            });
        };

        wrapper.addEventListener("click", handleClick);
        return () => wrapper.removeEventListener("click", handleClick);
    }, []);

    return (
        <div
            className="relative w-screen h-screen overflow-hidden cursor-pointer font-mono text-6xl"
            ref={wrapperRef}
        >
            <div ref={frontRef} className="absolute inset-0 p-2 text-8xl tracking-tight" />
            <div ref={backRef}  className="absolute inset-0 p-2 text-8xl tracking-tight" />
        </div>
    );
}

interface PillProps {
    children: ReactNode,
    i: number,
    isReady: boolean
}

export const Pill = ({ children, i, isReady }: PillProps) => {

    const parallaxRef = useRef<HTMLDivElement>(null);
    const pillRef = useRef<HTMLDivElement>(null);
    const [offset] = useState({ x: 0, y: 0, r: 0 })

    const bg = PALETTE[i % PALETTE.length];

    // intro fly-in + float
    useEffect(() => {
        if (!pillRef.current || !isReady) return;

        const minRadius = 80;
        const maxRadius = 260;

        const angle = getRandomArbitrary(0, Math.PI * 2);
        const radius = getRandomArbitrary(minRadius, maxRadius);

        const offsetX = Math.cos(angle) * radius;
        const offsetY = Math.sin(angle) * radius;

        const rotate = getRandomArbitrary(15, 35);
        const r = i % 2 === 0 ? -rotate : rotate;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const toEdge = Math.min(
            Math.abs((vw / 2) / (Math.cos(angle) || 0.0001)),
            Math.abs((vh / 2) / (Math.sin(angle) || 0.0001))
        );
        const startDist = toEdge + 120;
        const startX = Math.cos(angle) * startDist;
        const startY = Math.sin(angle) * startDist;

        gsap.timeline()
            .set(pillRef.current, { opacity: 1, x: startX, y: startY, rotation: 0 })
            .to(pillRef.current, {
                opacity: 1, x: offsetX, y: offsetY, rotation: r,
                delay: i * 0.07, duration: 0.5, ease: "expo.out",
            });
    }, [i, isReady]);

    // parallax — each pill has its own random depth
    useEffect(() => {
        const el = parallaxRef.current;
        if (!el) return;

        const depth = getRandomArbitrary(0.04, 0.14) * (Math.random() > 0.5 ? 1 : -1);
        const quickX = gsap.quickTo(el, "x", { duration: 0.6, ease: "power2.out" });
        const quickY = gsap.quickTo(el, "y", { duration: 0.6, ease: "power2.out" });

        const onMove = (e: MouseEvent) => {
            const nx = (e.clientX / window.innerWidth - 0.5) * 2; // -1 → 1
            const ny = (e.clientY / window.innerHeight - 0.5) * 2;
            quickX(nx * depth * window.innerWidth * 0.1);
            quickY(ny * depth * window.innerHeight * 0.1);
        };

        window.addEventListener("mousemove", onMove);
        return () => window.removeEventListener("mousemove", onMove);
    }, []);

    return (
        <div ref={parallaxRef} className="absolute top-1/2 left-1/2">
            <div ref={pillRef} className="w-40 h-30 rounded-full flex items-center justify-center text-3xl" style={{
                backgroundColor: bg.bg,
                opacity: 0,
                transform: `rotate(${offset.r}deg)translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`
            }}>
                {children}
            </div>
        </div>
    );
}

export default IntroSection;
