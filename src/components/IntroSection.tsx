import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { chunkArray, getRandomArbitrary } from "@/app/helpers";
import { PALETTE } from "@/app/constants";

const IntroSection = () => {
    const theme = { bg: "#1a1a1a", fg: "#ffffff" };
    const wrapperRef  = useRef<HTMLDivElement>(null);
    const expanderRef = useRef<HTMLDivElement>(null);
    const wordRef     = useRef<HTMLDivElement>(null);


    const pills = useMemo(() => {
        const items = ["Banana", "Cherry", "Peach", "Strawberry", "Mangoe", "Grapefruit", "Citron", "Bleuet", "Framboise"];

        return items.map((item, i) => {

            return <Pill key={i} i={i}>{item}</Pill>
    })
        

    }, [])

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
    children: ReactElement,
    i: number
}

export const Pill = ({children, i}: PillProps) => {

    const pillRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState({x:0, y: 0, r: 0})

       const bg = PALETTE[i % PALETTE.length];
      
       useEffect(() => {

        if (!pillRef.current) return;

        const { width, height } = pillRef.current.getBoundingClientRect();

            const offsetFactorX = 20;
            const offsetFactorY = 40;
            let minOffsetX = width;
            let maxOffsetX = width + offsetFactorX;
            let minOffsetY = height;
            let maxOffsetY = height + offsetFactorY;

            const isMinus = Math.random() > 0.5;

            if (isMinus) {
                minOffsetX = minOffsetX * -1;
                maxOffsetX = maxOffsetX * -1;

                minOffsetY = minOffsetY * -1;
                maxOffsetY = maxOffsetY * -1;
            }




            

            const offsetX = getRandomArbitrary(minOffsetX, maxOffsetX);
            const offsetY = getRandomArbitrary(minOffsetY, maxOffsetY);


            const minR = 20;
            const maxR = 40;
            const rotate = getRandomArbitrary(minR, maxR);
            const r = i % 2 === 0 ? -(rotate) : rotate;

            

            setOffset({
                x: offsetX,
                y: offsetY,
                r
            })
       }, [i])


            return <div ref={pillRef} className="px-4 py-10 rounded-full text-3xl absolute top-1/2 left-1/2" style={{
                backgroundColor: bg,
                transform: `rotate(${offset.r}deg)translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`
            }}>{children}</div>
}

export default IntroSection;
