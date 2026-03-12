'use client'

import { useRef } from "react";

const ConsentScreen = () => {

    const splitTextRef = useRef<HTMLDivElement>(null);
        

    return <div className="fixed top-0 left-0 w-screen h-screen p-2 bg-[#0ba585] z-10">
        <style jsx>
            {`
                body {
                    display: none;
                }
            `}
        </style>
        <div className="flex flex-col items-start justify-between w-full h-full">
            <div className="font-mono text-[4.5vw] tracking-tight leading-[1.1] [.line]:hidden text-[#141414]" ref={splitTextRef}>
                <span>Crumb is an infinite digital canvas for the queer community — a space for expression, creativity, and connection. You’re free to contribute anything, as long as it is respectful, non-harmful, and helps keep Crumb safe and welcoming for everyone.</span>
                <button className="underline decoration-2 cursor-pointer underline-offset-3">Enter</button>
            </div>
         
        </div>
    </div>
}

export default ConsentScreen;