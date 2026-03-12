'use client'

import { useRef } from "react";
import gsap from "gsap";

const ConsentScreen = ({ onEnter }: { onEnter: () => void }) => {
    const splitTextRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleEnter = () => {
        document.cookie = "crumb_consented=true; max-age=31536000; path=/; SameSite=Lax";
        gsap.to(wrapperRef.current, {
            opacity: 0,
            duration: 0.6,
            ease: "power2.inOut",
            onComplete: onEnter,
        });
    };

    return (
        <div ref={wrapperRef} className="fixed inset-0 z-10 overflow-hidden">
            <style jsx>
                {`
                    body {
                        display: none;
                    }
                `}
            </style>
            <svg
                className="absolute inset-0 w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
                style={{ overflow: "visible" }}
            >
                <g>
                    <rect width="100%" height="100%" fill="#0ba585" />
                    <foreignObject x="0" y="0" width="100%" height="100%">
                        <div className="w-full h-full flex flex-col items-start justify-between p-2">
                            <div
                                className="flex flex-col justify-between h-full font-mono text-[4.5vw] tracking-tight leading-[1.1] text-[#141414]"
                                ref={splitTextRef}
                            >
                                <span>
                                    Crumb is an infinite digital canvas for the queer community •ᴗ• a space for
                                    expression, creativity, and connection. You’re free to contribute anything,
                                    as long as it is respectful, non-harmful, and helps keep Crumb safe and welcoming
                                    for everyone. Otherwise, bye .✦ ݁˖
                                </span>
                                <span className="self-end">
                                    <button className="underline underline-offset-2 decoration-2 px-[1vw] uppercase cursor-pointer" onClick={handleEnter} style={{
                                        fontFamily: "ABC Diatype Rounded"
                                    }}>I Agree</button>
                                </span>
                            </div>
                        </div>
                    </foreignObject>
                </g>
            </svg>
        </div>
    );
};

export default ConsentScreen;
