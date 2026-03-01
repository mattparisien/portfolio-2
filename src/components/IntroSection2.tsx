import { ReactNode, useEffect, useRef, useState } from "react";
import { getRandomArbitrary } from "@/app/helpers";
import gsap from "gsap";
import { useSplitText } from "@/app/hooks/useSplitText";
import classNames from "classnames";

const SHARED_TEXT = "UX Engineer for complex <Products/> based in Montreal"

const PALETTE = [
    {bg: "#00AF59", fg: "#000F00", text: SHARED_TEXT },
    {bg: "#FFD0E1", fg: "#000F00", text: SHARED_TEXT },
    {bg: "#D72D2C", fg: "#F2F0E5", text: SHARED_TEXT },
    {bg: "#FAFF00", fg: "#000F00", text: SHARED_TEXT },
    {bg: "#C8A3E1", fg: "#1E1C1F", text: SHARED_TEXT },
    {bg: "#252122", fg: "#F2F0E5", text: SHARED_TEXT },
    {bg: "white",   fg: "#1542FA", text: SHARED_TEXT },
];

// Characters used while shuffling
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*?";

const STAGGER          = 45;   // ms between each char becoming visible
const SHUFFLE_DURATION = 900;  // ms each char spends cycling glyphs
const TICK_INTERVAL    = 60;   // ms between DOM updates (~16 fps)

// ─── ShuffleText component ─────────────────────────────────────────────────────
interface ShuffleTextProps { text: string; animate: boolean; className?: string, linesClassName?: string }

function ShuffleText({ text, animate, className, linesClassName }: ShuffleTextProps) {
    const containerRef = useRef<HTMLSpanElement>(null);
    const { chars, isReady } = useSplitText(containerRef, { type: "chars,words,lines", linesClass: classNames("lines", linesClassName) });

    useEffect(() => {
        if (!isReady) return;

        const letterEls = chars as HTMLElement[];
        // SplitText skips spaces, so read each span's own textContent as the
        // target character — avoids index drift against the space-inclusive string.
        const targets = letterEls.map(el => el.textContent ?? "");

        if (!animate) {
            // Non-animated layer: restore original content and make visible
            letterEls.forEach((el, i) => {
                el.style.visibility = "visible";
                el.textContent = targets[i];
            });
            return;
        }

        // Hide all chars before the first tick
        letterEls.forEach(el => { el.style.visibility = "hidden"; });

        const start = performance.now();
        let raf: number;
        let lastTick = 0;

        const tick = (now: number) => {
            const elapsed = now - start;

            if (now - lastTick >= TICK_INTERVAL) {
                lastTick = now;
                letterEls.forEach((el, i) => {
                    const ch        = targets[i];
                    const visibleAt = i * STAGGER;
                    const lockAt    = visibleAt + SHUFFLE_DURATION;

                    if (elapsed < visibleAt) {
                        el.style.visibility = "hidden";
                    } else if (elapsed >= lockAt) {
                        el.style.visibility = "visible";
                        el.textContent = ch;
                    } else {
                        el.style.visibility = "visible";
                        el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                    }
                });
            }

            const totalDuration = (targets.length - 1) * STAGGER + SHUFFLE_DURATION;
            if (elapsed < totalDuration) {
                raf = requestAnimationFrame(tick);
            } else {
                // Guarantee final state
                letterEls.forEach((el, i) => {
                    el.style.visibility = "visible";
                    el.textContent = targets[i];
                });
            }
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [isReady, animate, chars]);

    return <span ref={containerRef} className={className}>{text}</span>;
}

// ─── IntroSection ──────────────────────────────────────────────────────────────
interface TextSlot { text: string; animate: boolean; id: number }

const IntroSection = () => {
    const wrapperRef   = useRef<HTMLDivElement>(null);
    const frontRef     = useRef<HTMLDivElement>(null);
    const backRef      = useRef<HTMLDivElement>(null);
    const currentIndex = useRef<number>(0);

    // React drives the text content; GSAP drives colors + clipPath
    const [frontSlot, setFrontSlot] = useState<TextSlot>({ text: PALETTE[0].text, animate: true,  id: 0 });
    const [backSlot,  setBackSlot]  = useState<TextSlot>({ text: PALETTE[1].text, animate: false, id: 1 });

    useEffect(() => {
        const wrapper = wrapperRef.current;
        const front   = frontRef.current;
        const back    = backRef.current;
        if (!wrapper || !front || !back) return;

        const p0 = PALETTE[0];
        const p1 = PALETTE[1];
        // GSAP owns backgrounds, colors, and clip-path — React owns children
        gsap.set(front, { backgroundColor: p0.bg, color: p0.fg });
        gsap.set(back,  { backgroundColor: p1.bg, color: p1.fg, clipPath: "circle(0px at 50% 50%)" });

        const handleClick = (e: MouseEvent) => {
            const idx     = ++currentIndex.current;
            const current = PALETTE[idx       % PALETTE.length];
            const next    = PALETTE[(idx + 1) % PALETTE.length];

            const rect = wrapper.getBoundingClientRect();
            const cx   = e.clientX - rect.left;
            const cy   = e.clientY - rect.top;
            const maxR = Math.max(
                Math.hypot(cx,             cy),
                Math.hypot(cx - rect.width, cy),
                Math.hypot(cx,             cy - rect.height),
                Math.hypot(cx - rect.width, cy - rect.height),
            );

            gsap.killTweensOf(back);
            gsap.set(back, {
                backgroundColor: current.bg,
                color:           current.fg,
                clipPath:        `circle(0px at ${cx}px ${cy}px)`,
            });

            // Trigger shuffle on back layer as it is revealed
            setBackSlot({ text: current.text, animate: true, id: idx * 2 });

            gsap.to(back, {
                clipPath: `circle(${maxR}px at ${cx}px ${cy}px)`,
                duration: 0.8,
                ease:     "expo.inOut",
                onComplete() {
                    // Bake revealed palette into front (no shuffle — already visible)
                    gsap.set(front, { backgroundColor: current.bg, color: current.fg });
                    setFrontSlot({ text: current.text, animate: false, id: idx * 2 + 1 });

                    // Reset back to next palette entry (hidden, no shuffle yet)
                    gsap.set(back, {
                        backgroundColor: next.bg,
                        color:           next.fg,
                        clipPath:        "circle(0px at 50% 50%)",
                    });
                    setBackSlot({ text: next.text, animate: false, id: idx * 2 + 2 });
                },
            });
        };

        wrapper.addEventListener("click", handleClick);
        return () => wrapper.removeEventListener("click", handleClick);
    }, []);

    const linesClassName = "translate-x-[calc(var(--line-index)_*_30%)] overflow-hidden";

    return (
        <div
            className="relative w-screen h-screen overflow-hidden cursor-pointer font-mono"
            ref={wrapperRef}
        >
            <div ref={frontRef} className="absolute flex inset-0 p-2 text-[3rem] leading-[1.1] tracking-tight">
                <ShuffleText key={frontSlot.id} text={frontSlot.text} animate={frontSlot.animate}  className="max-w-80"  linesClassName={linesClassName}/>
            </div>
            <div ref={backRef} className="absolute flex inset-0 p-2 text-[3rem] leading-[1.1] tracking-tight">
                <ShuffleText key={backSlot.id} text={backSlot.text} animate={backSlot.animate} className="max-w-80" linesClassName={linesClassName}/>
            </div>
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
