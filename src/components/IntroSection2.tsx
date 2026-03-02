import { ReactNode, useEffect, useRef, useState } from "react";
import { getRandomArbitrary } from "@/app/helpers";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SHARED_TEXT = "Somewhere In Between Art & Software";

const PALETTE = [
    {bg: "#00AF59", fg: "#000F00", text: SHARED_TEXT },
    {bg: "#D72D2C", fg: "#F2F0E5", text: SHARED_TEXT },
    {bg: "#FAFF00", fg: "#000F00", text: SHARED_TEXT },
    {bg: "#C8A3E1", fg: "#6E6025", text: SHARED_TEXT },
    {bg: "#252122", fg: "#F2F0E5", text: SHARED_TEXT },
        {bg: "#E65483", fg: "#000F00", text: SHARED_TEXT },

    {bg: "white",   fg: "#1542FA", text: SHARED_TEXT },
];

// ─── IntroSection ──────────────────────────────────────────────────────────────


const IntroSection = () => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const stickyRef  = useRef<HTMLDivElement>(null);
    const frontRef   = useRef<HTMLDivElement>(null);
    const backRef    = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const back = backRef.current;
        const wrapper = wrapperRef.current;
        if (!back || !wrapper) return;

        // Start hidden
        gsap.set(back, { clipPath: "circle(0% at 50% 50%)" });

        const st = ScrollTrigger.create({
            trigger: wrapper,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            onUpdate(self) {
                const r = self.progress * 150;
                gsap.set(back, { clipPath: `circle(${r}% at 50% 50%)` });
            },
        });

        return () => st.kill();
    }, []);

    return (
        // Outer wrapper is 200vh — gives 100vh of scroll while sticky panel is pinned
        <div ref={wrapperRef} className="relative h-[200vh]">
            <div ref={stickyRef} className="sticky top-0 w-screen h-screen overflow-hidden">

                {/* Front layer — always visible */}
                <div ref={frontRef} className="absolute inset-0 font-jumbo flex flex-col leading-tight">
                    <div className="text-[23vw] flex h-full justify-center items-end leading-tight tracking-tighter">
                        <div>WHO THAT?</div>
                    </div>
                </div>

                {/* Back layer — revealed by scroll-driven circle clip-path */}
                <div ref={backRef} className="absolute inset-0 px-4 font-mono flex flex-col text-5xl leading-tight">
                    <div className="flex w-full justify-between">
                        Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolores voluptatum commodi nulla dignissimos cumque obcaecati consequuntur labore neque odio cum, nesciunt vero suscipit blanditiis est. Magni quas nostrum aut consequatur quis incidunt! Placeat sequi nesciunt, ex quam qui aperiam ea animi tempore quaerat blanditiis perferendis eaque dolore, obcaecati totam quas.
                    </div>
                </div>

            </div>
        </div>
    );
}

interface PillProps {
    children: ReactNode,
    i: number,
    isReady: boolean
}

export const Pill = ({ i, isReady }: PillProps) => {

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
                {/* {children} */}
            </div>
        </div>
    );
}

export default IntroSection;
