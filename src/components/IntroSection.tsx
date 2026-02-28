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
        const items = ["Banana", "Cherry", "Peach", "Strawberry", "Mangoe", "Grapefruit", "Citron", "Bleuet", "Framboise"];

        return items.map((item, i) => {

            return <Pill key={i} i={i} isReady={isReady}>{item}</Pill>
    })
        

    }, [isReady])

    return (
        <div
            className="relative w-screen h-screen font-mono text-6xl overflow-hidden bg-white text-black"
            style={{ backgroundColor: theme.bg, color: theme.bg }}
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

    const pillRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState({x:0, y: 0, r: 0})

       const bg = PALETTE[i % PALETTE.length];
      
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

        const startX = Math.cos(angle) * (radius + 200);
        const startY = Math.sin(angle) * (radius + 200);

        gsap.timeline().set(pillRef.current, {
            opacity: 1,
            x: startX,
            y: startY,
            rotation: 0
        }).to(pillRef.current, {
            opacity: 1,
            x: offsetX,
            y: offsetY,
            rotation: r,
            delay: i * 0.1 + 0.5,
            duration: 1.5,
            ease: "power3.out"
        })
       }, [i, isReady])




            return <div ref={pillRef} className="px-4 py-10 rounded-full text-3xl absolute top-1/2 left-1/2" style={{
                backgroundColor: bg,
                opacity: isReady ? 1 : 0,
                transform: `rotate(${offset.r}deg)translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`
            }}>{children}</div>
}

export default IntroSection;
