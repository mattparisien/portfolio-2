'use client'
import { useEffect, useRef } from "react";
import { useSplitText } from "../hooks/useSplitText";
import gsap from "gsap";


const Page = () => {

    const splitTextRef = useRef<HTMLDivElement>(null);
    const splitText = useSplitText(splitTextRef, {
        type: "words"
    });
    const hasAnimatedInRef = useRef<boolean>(false);

    useEffect(() => {
        const logo = document.getElementById("header-logo");
        return () => {
            if (logo) gsap.set(logo, { x: 0, opacity: 1 });
        };
    }, []);

    useEffect(() => {
        if (!splitText.isReady || hasAnimatedInRef.current) return;
        const words = splitText.words;

        words.forEach(word => {
            gsap.set(word, { opacity: 0 })
        }
        );

        gsap.set(splitTextRef.current, { opacity: 1 })

        const logo = document.getElementById("header-logo");

        const { left } = splitTextRef.current!.getBoundingClientRect();
        const { left: logoLeft } = logo!.getBoundingClientRect();

        const distance = logoLeft - left;

        gsap.to(logo, {
            x: -distance,
            duration: 0.3,
            ease: "steps(4)",
            step: 0.3,
            onComplete: () => {
                gsap.to(words, {
                    opacity: 1,
                    stagger: 0.05,
                    duration: 0,
                    ease: "power4.out",
                    onStart: () => gsap.set(logo, { opacity: 0 }),
                })  
            }
        })
        hasAnimatedInRef.current = true;
    }, [splitText])



    return <div className="w-screen h-screen bg-pink-200 text-fg flex flex-col items-center justify-center px-appBounds py-appBounds">
        <div className="relative w-full h-full">
            <div className="-mt-3 text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-heading absolute top-0 left-0 tracking-tight opacity-0 leading-[1.1]" ref={splitTextRef}>
Crumb is a live collaborative canvas built for queer creativity and connection.
Part social space, part creative tool, Crumb brings together the expressiveness of Tumblr and the co-creation of Figma so people can make, share, and remix together in real time. Whether you’re sketching ideas, building moodboards, writing, or just playing with others, Crumb is designed to help queer communities create culture together—not just post into the void.                </div>
        </div>
    </div>
}

export default Page;