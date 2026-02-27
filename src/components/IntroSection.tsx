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
            console.log(circleRef.current)
            const { clientX, clientY } = e;
            const { width, height } = circleRef.current?.getBoundingClientRect();
            circleRef.current.style.transform = `translate(${clientX - width / 2}px, ${clientY - height / 2}px)`;

            if (animationRef.current?.isActive()) {
                animationRef.current.kill();
            }
         
                animationRef.current = gsap.timeline()
                .set(circleRef.current, { scale: 0, x: clientX - width / 2, y: clientY - height / 2, duration: 0})
                .to(circleRef.current, {
                    scale: 10,
                    duration: 1,
                    ease: "expo.inOut",
                    x: clientX - width / 2,
                    y: clientY - height / 2
                })
              
            

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