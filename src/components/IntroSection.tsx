import { useEffect, useRef } from "react";
import gsap from "gsap";

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
            const el = circleRef.current;
            // offsetWidth/offsetHeight are unaffected by CSS scale transforms
            const x = clientX - el.offsetWidth / 2;
            const y = clientY - el.offsetHeight / 2;

            animationRef.current?.kill();

            animationRef.current = gsap.timeline()
                .set(el, { x, y, scale: 0 })
                .to(el,  { scale: 10, duration: 0.5, ease: "expo.inOut" });
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