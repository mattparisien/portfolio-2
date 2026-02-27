import { useEffect, useRef } from "react";
import gsap from "gsap";
import { PALETTE } from "@/app/constants";

const IntroSection = () => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const circleRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<GSAPTimeline>(null);
    const themeRef = useRef({
        bg: null,
        fg: null
    })

    useEffect(() => {

        const handleClick = (e) => {
            const { clientX, clientY } = e;
            const el      = circleRef.current;
            const wrapper = wrapperRef.current;
            const radius  = el.offsetWidth / 2;

            // Position circle centred on click (natural/unscaled size)
            const x = clientX - radius;
            const y = clientY - radius;

            // Find the farthest corner of the wrapper from the click point —
            // the circle must reach it to fully cover the section.
            const rect = wrapper.getBoundingClientRect();
            const maxDist = Math.max(
                Math.hypot(clientX - rect.left,  clientY - rect.top),
                Math.hypot(clientX - rect.right, clientY - rect.top),
                Math.hypot(clientX - rect.left,  clientY - rect.bottom),
                Math.hypot(clientX - rect.right, clientY - rect.bottom),
            );
            const targetScale = maxDist / radius;

            animationRef.current?.kill();

            animationRef.current = gsap.timeline()
                .set(el, { x, y, scale: 0 })
                .to(el,  { scale: targetScale, duration: 0.5, ease: "expo.inOut" });
        }


        window.addEventListener("click", handleClick);
    }, [])


    return (
        <div className="font-display relative text-6xl leading-normal flex flex-col justify-between items-start w-screen h-[100dvh] fixed top-0 left-0 sm:px-8 sm:py-5 px-4 py-3" style={{
            backgroundColor: "#1a1a1a",
            color: "white"
        }}
            ref={wrapperRef}
        >
            <p className="z-20">Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p>
            <div className="circle z-10 w-10 h-10 bg-blue-200 absolute top-0 left-0 rounded-full" ref={circleRef}></div>
        </div>
    )
}

export default IntroSection;