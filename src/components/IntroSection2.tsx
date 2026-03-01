import { ReactNode, useEffect, useRef, useState } from "react";
import { getRandomArbitrary } from "@/app/helpers";
import gsap from "gsap";
import { useSplitText } from "@/app/hooks/useSplitText";
import classNames from "classnames";

const SHARED_TEXT = "Somewhere In Between Art & Software";

const PALETTE = [
    {bg: "#00AF59", fg: "#000F00", text: SHARED_TEXT },
    {bg: "#D72D2C", fg: "#F2F0E5", text: SHARED_TEXT },
    {bg: "#FAFF00", fg: "#000F00", text: SHARED_TEXT },
    {bg: "#C8A3E1", fg: "#1E1C1F", text: SHARED_TEXT },
    {bg: "#252122", fg: "#F2F0E5", text: SHARED_TEXT },
        {bg: "#E65483", fg: "#000F00", text: SHARED_TEXT },

    {bg: "white",   fg: "#1542FA", text: SHARED_TEXT },
];

// Characters used while shuffling
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*?";

const STAGGER          = 20;   // ms between each char becoming visible
const SHUFFLE_DURATION = 500;  // ms each char spends cycling glyphs
const TICK_INTERVAL    = 40;   // ms between DOM updates (~16 fps)

const EXIT_SHUFFLE_DURATION = 400; // ms each char spends shuffling before vanishing
const HOLD_DELAY            = 600; // ms pause between entrance finishing and exit starting

// ─── ShuffleText component ─────────────────────────────────────────────────────
interface ShuffleTextProps { text: string; animate: boolean; exit?: boolean; wiggleTrigger?: number; className?: string, linesClassName?: string }

function ShuffleText({ text, animate, exit = false, wiggleTrigger = 0, className, linesClassName }: ShuffleTextProps) {
    const containerRef = useRef<HTMLSpanElement>(null);
    const exitRef      = useRef(exit);
    exitRef.current    = exit;
    const { chars, isReady } = useSplitText(containerRef, { type: "chars,words,lines", linesClass: classNames("lines", linesClassName) });

    // Wiggle a different random char each time the trigger increments
    useEffect(() => {
        if (!isReady || wiggleTrigger === 0 || chars.length === 0) return;
        const el = chars[Math.floor(Math.random() * chars.length)] as HTMLElement;
        gsap.killTweensOf(el);
        gsap.timeline()
            .to(el, { rotation: -18, y: -6, scale: 1.3, duration: 0.08, ease: "power2.out" })
            .to(el, { rotation:  14, y:  4, scale: 1.1, duration: 0.1,  ease: "power2.inOut" })
            .to(el, { rotation:  -8, y: -2, scale: 1.05, duration: 0.1, ease: "power2.inOut" })
            .to(el, { rotation:   0, y:  0, scale: 1,   duration: 0.12, ease: "elastic.out(1, 0.4)" });
    }, [wiggleTrigger, isReady, chars]);
    useEffect(() => {
        if (!isReady) return;

        const letterEls = chars as HTMLElement[];
        // SplitText skips spaces, so read each span's own textContent as the
        // target character — avoids index drift against the space-inclusive string.
        const targets = letterEls.map(el => el.textContent ?? "");

        if (exitRef.current && !animate) {
            // Exit-only: chars are already visible, shuffle then disappear one-by-one
            letterEls.forEach((el, i) => {
                el.style.visibility = "visible";
                el.textContent = targets[i];
            });

            let exitRaf: number;
            const runExit = () => {
                const exitStart = performance.now();
                let exitLastTick = 0;

                const exitTick = (now: number) => {
                    const elapsed = now - exitStart;

                    if (now - exitLastTick >= TICK_INTERVAL) {
                        exitLastTick = now;
                        letterEls.forEach((el, i) => {
                            const shuffleAt = i * STAGGER;
                            const hideAt    = shuffleAt + EXIT_SHUFFLE_DURATION;

                            if (elapsed < shuffleAt) {
                                // not yet — still showing final char
                            } else if (elapsed >= hideAt) {
                                el.style.visibility = "hidden";
                            } else {
                                el.style.visibility = "visible";
                                el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                            }
                        });
                    }

                    const totalDuration = (targets.length - 1) * STAGGER + EXIT_SHUFFLE_DURATION;
                    if (elapsed < totalDuration) {
                        exitRaf = requestAnimationFrame(exitTick);
                    } else {
                        // Guarantee last char is hidden
                        letterEls.forEach(el => { el.style.visibility = "hidden"; });
                    }
                };
                exitRaf = requestAnimationFrame(exitTick);
            };

            runExit();
            return () => cancelAnimationFrame(exitRaf);
        }

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
        let holdTimeout: ReturnType<typeof setTimeout>;
        let exitRaf: number;
        let lastTick = 0;

        const runExit = () => {
            // Guarantee entrance final state first
            letterEls.forEach((el, i) => {
                el.style.visibility = "visible";
                el.textContent = targets[i];
            });

            const exitStart = performance.now();
            let exitLastTick = 0;

            const exitTick = (now: number) => {
                const elapsed = now - exitStart;

                if (now - exitLastTick >= TICK_INTERVAL) {
                    exitLastTick = now;
                    letterEls.forEach((el, i) => {
                        const shuffleAt = i * STAGGER;
                        const hideAt    = shuffleAt + EXIT_SHUFFLE_DURATION;

                        if (elapsed < shuffleAt) {
                            // not yet — still showing final char
                        } else if (elapsed >= hideAt) {
                            el.style.visibility = "hidden";
                        } else {
                            el.style.visibility = "visible";
                            el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                        }
                    });
                }

                const totalDuration = (targets.length - 1) * STAGGER + EXIT_SHUFFLE_DURATION;
                if (elapsed < totalDuration) {
                    exitRaf = requestAnimationFrame(exitTick);
                } else {
                    // Guarantee last char is hidden
                    letterEls.forEach(el => { el.style.visibility = "hidden"; });
                }
            };
            exitRaf = requestAnimationFrame(exitTick);
        };

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
                // Chain exit after a hold delay if requested
                if (exitRef.current) holdTimeout = setTimeout(runExit, HOLD_DELAY);
            }
        };

        raf = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(raf);
            cancelAnimationFrame(exitRaf);
            clearTimeout(holdTimeout);
        };
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

    const [wiggleTrigger, setWiggleTrigger] = useState(0);

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
            setWiggleTrigger(t => t + 1);
            gsap.set(back, {
                backgroundColor: current.bg,
                color:           current.fg,
                clipPath:        `circle(0px at ${cx}px ${cy}px)`,
            });

            // Back layer reveals via clip-path — no shuffle needed after first load
            setBackSlot({ text: current.text, animate: false, id: idx * 2 });

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

    const linesClassName = "overflow-hidden";

    return (
        <div
            className="relative w-screen h-screen overflow-hidden cursor-pointer font-mono"
            ref={wrapperRef}
        >
            <div ref={frontRef} className="absolute flex inset-0 p-2 text-[9rem] leading-[1.1] tracking-tight">
                <ShuffleText key={frontSlot.id} text={frontSlot.text} animate={frontSlot.animate} wiggleTrigger={wiggleTrigger} className=""  linesClassName={linesClassName} />
            </div>
            <div ref={backRef} className="absolute flex inset-0 p-2 text-[9rem] leading-[1.1] tracking-tight">
                <ShuffleText key={backSlot.id} text={backSlot.text} animate={backSlot.animate} className="" linesClassName={linesClassName} />
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
