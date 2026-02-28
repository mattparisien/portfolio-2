import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { getRandomArbitrary } from "@/app/helpers";
import { PALETTE } from "@/app/constants";
import gsap from "gsap";

const IntroSection = () => {
    const theme = { bg: "#1a1a1a", fg: "#ffffff" };
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsReady(true);
        }, 1000);

        return () => clearTimeout(timeout);
    }, [])


    const pills = useMemo(() => {
        const items = [
  "Research",
  "Systems",
  "Interaction",
  "Visual",
  "Prototyping",
  "Accessibility",
  "Strategy",
  "Collaboration",
  "Engineering",
  "Experimentation",
];

        return items.map((item, i) => {

            return <Pill key={i} i={i} isReady={isReady}>{item}</Pill>
    })
        

    }, [isReady])

    return (
        <div
            className="relative w-screen h-screen font-mono text-6xl overflow-hidden bg-white text-black"
            style={{ backgroundColor: "white", color: theme.bg }}
            ref={wrapperRef}
        >
            {pills}   
        </div>
    )
}

interface PillProps {
    children: ReactNode,
    i: number,
    isReady: boolean
}

export const Pill = ({children, i, isReady}: PillProps) => {

    const parallaxRef = useRef<HTMLDivElement>(null);
    const pillRef     = useRef<HTMLDivElement>(null);
    const [offset] = useState({x:0, y: 0, r: 0})

    const bg = PALETTE[i % PALETTE.length];

    // intro fly-in + float
    useEffect(() => {
        if (!pillRef.current || !isReady) return;

        const minRadius = 80;
        const maxRadius = 260;

        const angle  = getRandomArbitrary(0, Math.PI * 2);
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
                delay: i * 0.07, duration: 1, ease: "expo.out",
            });
    }, [i, isReady]);

    // parallax — each pill has its own random depth
    useEffect(() => {
        const el = parallaxRef.current;
        if (!el) return;

        const depth  = getRandomArbitrary(0.04, 0.14) * (Math.random() > 0.5 ? 1 : -1);
        const quickX = gsap.quickTo(el, "x", { duration: 0.6, ease: "power2.out" });
        const quickY = gsap.quickTo(el, "y", { duration: 0.6, ease: "power2.out" });

        const onMove = (e: MouseEvent) => {
            const nx = (e.clientX / window.innerWidth  - 0.5) * 2; // -1 → 1
            const ny = (e.clientY / window.innerHeight - 0.5) * 2;
            quickX(nx * depth * window.innerWidth  * 0.1);
            quickY(ny * depth * window.innerHeight * 0.1);
        };

        window.addEventListener("mousemove", onMove);
        return () => window.removeEventListener("mousemove", onMove);
    }, []);

    return (
        <div ref={parallaxRef} className="absolute top-1/2 left-1/2">
            <div ref={pillRef} className="w-40 h-30 rounded-full flex items-center justify-center text-3xl" style={{
                backgroundColor: bg,
                opacity: 0,
                transform: `rotate(${offset.r}deg)translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`
            }}>
                {children}
            </div>
        </div>
    );
}

export default IntroSection;
