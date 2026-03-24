'use client'
import { useEffect, useRef } from "react";
import { useSplitText } from "../hooks/useSplitText";
import { useRouter } from "next/navigation";
import gsap from "gsap";


const Page = () => {

    const router = useRouter();
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
        gsap.to(words, {
            opacity: 1,
            stagger: 0.05,
            duration: 0,
            ease: "power4.out",
        })
        // gsap.to(logo, {
        //     x: -distance,
        //     duration: 0.3,
        //     ease: "steps(4)",
        //     step: 0.3,
        //     onComplete: () => {
        //         gsap.to(words, {
        //             opacity: 1,
        //             stagger: 0.05,
        //             duration: 0,
        //             ease: "power4.out",
        //         })  
        //     }
        // })
        hasAnimatedInRef.current = true;
    }, [splitText])



    return <div className="w-screen h-screen bg-yellow-200 text-fg flex flex-col items-center justify-center px-appBounds py-appBounds">
        <div className="-mt-3 text-3xl sm:text-4xl md:text-4xl lg:text-5xl font-heading tracking-tight opacity-0 leading-[1.1]" ref={splitTextRef}>
            Crumb is a live collaborative canvas built for queer creativity and connection.
            Part social space, part creative tool, Crumb brings together the expressiveness of Tumblr and the co-creation of Figma so people can make, share, and remix together in real time. Whether you’re sketching ideas, building moodboards, writing, or just playing with others, Crumb is designed to help queer communities create culture together—not just post into the void.                </div>
        <button
            onClick={() => router.push("/")}
            aria-label="Close"
            className="absolute cursor-pointer top-appBounds right-appBounds w-10 h-10 flex items-center justify-center"
        >
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="4" y1="4" x2="20" y2="20" />
                <line x1="20" y1="4" x2="4" y2="20" />
            </svg>
        </button>
    </div>
}

export default Page;