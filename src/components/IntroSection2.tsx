import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getRandomArbitrary } from "@/app/helpers";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

gsap.registerPlugin(ScrollTrigger, MorphSVGPlugin);

const SHARED_TEXT = "Somewhere In Between Art & Software";

const PALETTE = [
  { bg: "#00AF59", fg: "#000F00", text: SHARED_TEXT },
  { bg: "#D72D2C", fg: "#F2F0E5", text: SHARED_TEXT },
  { bg: "#FAFF00", fg: "#000F00", text: SHARED_TEXT },
  { bg: "#C8A3E1", fg: "#6E6025", text: SHARED_TEXT },
  { bg: "#252122", fg: "#F2F0E5", text: SHARED_TEXT },
  { bg: "#E65483", fg: "#000F00", text: SHARED_TEXT },
  { bg: "white", fg: "#1542FA", text: SHARED_TEXT },
];

const blobsPaths = [
  "M58.2,-2.1C58.2,27.9,29.1,55.9,-1.4,55.9C-31.9,55.9,-63.8,27.9,-63.8,-2.1C-63.8,-32,-31.9,-64.1,-1.4,-64.1C29.1,-64.1,58.2,-32,58.2,-2.1Z",
  "M56.4,0.6C56.4,27.7,28.2,55.5,1.4,55.5C-25.4,55.5,-50.8,27.7,-50.8,0.6C-50.8,-26.4,-25.4,-52.9,1.4,-52.9C28.2,-52.9,56.4,-26.4,56.4,0.6Z",
  "M51.8,-0.4C51.8,26.2,25.9,52.4,0.4,52.4C-25.1,52.4,-50.2,26.2,-50.2,-0.4C-50.2,-26.9,-25.1,-53.9,0.4,-53.9C25.9,-53.9,51.8,-26.9,51.8,-0.4Z",
];

const IntroSection = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // Scale a <g>, not the <path>, to keep measurement sane.
  const blobGroupRef = useRef<SVGGElement>(null);
  const blobPathRef = useRef<SVGPathElement>(null);

  // Cache base (UNSCALED) bounds so we don't get a feedback loop.
  const baseRef = useRef({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const back = backRef.current;
    const blobG = blobGroupRef.current;
    const blobPath = blobPathRef.current;
    if (!wrapper || !back || !blobG || !blobPath) return;

    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

    const measureBase = () => {
      // Measure the blob group at scale=1 to get a stable "base" size.
      const prevScale = Number(gsap.getProperty(blobG, "scale")) || 0;

      gsap.set(blobG, { scale: 1, transformOrigin: "50% 50%" });
      const r = blobG.getBoundingClientRect();
      baseRef.current.w = r.width || 1;
      baseRef.current.h = r.height || 1;

      // Restore whatever it was (we set 0 initially below)
      gsap.set(blobG, { scale: prevScale });
    };

    // Initial states
    gsap.set(back, { clipPath: "circle(0% at 50% 50%)" });
    gsap.set(blobG, { transformOrigin: "50% 50%", scale: 0 }); // <-- START AT 0

    // Measure now and on refresh/resize
    measureBase();
    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);
    ScrollTrigger.addEventListener("refreshInit", measureBase);

    // Optional back reveal trigger (left as your placeholder)
    const stReveal = ScrollTrigger.create({
      trigger: wrapper,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate() {
        // gsap.set(back, { clipPath: `circle(${self.progress * 150}% at 50% 50%)` });
      },
    });

    // Blob scale trigger: progress 0..1 maps to scale 0..targetScale
    const stBlob = ScrollTrigger.create({
      trigger: wrapper,
      start: "top top",
      end: "+=100%",
      scrub: true,
      onUpdate(self) {
        const { w: bw } = baseRef.current;
        const vw = window.innerWidth || 1;
        const targetScale = vw / (bw || 1);
        const p = clamp01(self.progress);
        gsap.set(blobG, { scale: targetScale * p });
      },
    });

    // Morph timeline — scrubbed over the same scroll range
    const tlMorph = gsap.timeline({
      scrollTrigger: {
        trigger: wrapper,
        start: "top top",
        end: "+=100%",
        scrub: true,
      },
    });
    const segDur = 1 / (blobsPaths.length - 1);
    blobsPaths.forEach((d, i) => {
      if (i === 0) return;
      tlMorph.to(blobPath, { morphSVG: d, ease: "none", duration: segDur }, (i - 1) * segDur);
    });

    stBlob.refresh();

    return () => {
      stReveal.kill();
      stBlob.kill();
      tlMorph.kill();
      window.removeEventListener("resize", onResize);
      ScrollTrigger.removeEventListener("refreshInit", measureBase);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative h-[200vh]">
      <div ref={stickyRef} className="sticky top-0 w-screen h-screen overflow-hidden">
        {/* Front */}
        <div
          ref={frontRef}
          className="absolute inset-0 font-jumbo flex flex-col leading-tight"
          style={{ backgroundColor: PALETTE[0].bg, color: PALETTE[0].fg }}
        >
          <div className="relative w-full h-full">
            <div className="text-[23vw] flex h-full justify-center items-end leading-tight tracking-tighter">
              <div>WHO THAT?</div>
            </div>

            <svg
              aria-hidden
              viewBox="-100 -100 200 200"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "100vmin",
                height: "100vmin",
                transform: "translate(-50%, -50%)",
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              <g ref={blobGroupRef}>
                <path ref={blobPathRef} d={blobsPaths[0]} fill="currentColor" />
              </g>
            </svg>
          </div>
        </div>

        {/* Back */}
        <div
          ref={backRef}
          className="absolute inset-0 px-4 font-mono flex flex-col text-5xl leading-tight"
          style={{ backgroundColor: PALETTE[3].bg, color: PALETTE[3].fg }}
        >
          <div className="flex w-full justify-between">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolores voluptatum commodi nulla dignissimos
            cumque obcaecati consequuntur labore neque odio cum, nesciunt vero suscipit blanditiis est. Magni quas
            nostrum aut consequatur quis incidunt! Placeat sequi nesciunt, ex quam qui aperiam ea animi tempore
            quaerat blanditiis perferendis eaque dolore, obcaecati totam quas.
          </div>
        </div>
      </div>

      {/* (optional) extra svg below */}
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="#FF0066"
          d="M63.3,-0.2C63.3,26.2,31.7,52.3,-0.2,52.3C-32.1,52.3,-64.2,26.2,-64.2,-0.2C-64.2,-26.6,-32.1,-53.2,-0.2,-53.2C31.7,-53.2,63.3,-26.6,63.3,-0.2Z"
          transform="translate(100 100)"
        />
      </svg>
    </div>
  );
};

interface PillProps {
  children: ReactNode;
  i: number;
  isReady: boolean;
}

export const Pill = ({ i, isReady }: PillProps) => {
  const parallaxRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [offset] = useState({ x: 0, y: 0, r: 0 });

  const bg = PALETTE[i % PALETTE.length];

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
      Math.abs(vw / 2 / (Math.cos(angle) || 0.0001)),
      Math.abs(vh / 2 / (Math.sin(angle) || 0.0001))
    );
    const startDist = toEdge + 120;
    const startX = Math.cos(angle) * startDist;
    const startY = Math.sin(angle) * startDist;

    gsap
      .timeline()
      .set(pillRef.current, { opacity: 1, x: startX, y: startY, rotation: 0 })
      .to(pillRef.current, {
        opacity: 1,
        x: offsetX,
        y: offsetY,
        rotation: r,
        delay: i * 0.07,
        duration: 0.5,
        ease: "expo.out",
      });
  }, [i, isReady]);

  useEffect(() => {
    const el = parallaxRef.current;
    if (!el) return;

    const depth = getRandomArbitrary(0.04, 0.14) * (Math.random() > 0.5 ? 1 : -1);
    const quickX = gsap.quickTo(el, "x", { duration: 0.6, ease: "power2.out" });
    const quickY = gsap.quickTo(el, "y", { duration: 0.6, ease: "power2.out" });

    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      quickX(nx * depth * window.innerWidth * 0.1);
      quickY(ny * depth * window.innerHeight * 0.1);
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div ref={parallaxRef} className="absolute top-1/2 left-1/2">
      <div
        ref={pillRef}
        className="w-40 h-30 rounded-full flex items-center justify-center text-3xl"
        style={{
          backgroundColor: bg.bg,
          opacity: 0,
          transform: `rotate(${offset.r}deg)translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
        }}
      >
        {/* {children} */}
      </div>
    </div>
  );
};

export default IntroSection;