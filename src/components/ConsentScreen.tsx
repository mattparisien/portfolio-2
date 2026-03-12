'use client'

import { useEffect, useRef } from "react";
import gsap from "gsap";
import MorphSVGPlugin from "gsap/MorphSVGPlugin";


const ConsentScreen = () => {

    const splitTextRef = useRef<HTMLDivElement>(null);

    const paths = [
        "M53.9,-58.6C65.5,-42.4,67.4,-21.2,66,-1.4C64.6,18.4,59.9,36.8,48.3,51.5C36.8,66.3,18.4,77.4,0.8,76.5C-16.8,75.7,-33.5,63,-49.9,48.3C-66.3,33.5,-82.3,16.8,-84.6,-2.3C-86.9,-21.3,-75.4,-42.7,-59.1,-58.9C-42.7,-75.1,-21.3,-86.1,-0.1,-86.1C21.2,-86,42.4,-74.8,53.9,-58.6Z",
        "M45.9,-42.2C60.9,-30.8,75.6,-15.4,75.7,0.1C75.8,15.7,61.4,31.3,46.4,45.8C31.3,60.3,15.7,73.6,-1.8,75.4C-19.2,77.2,-38.4,67.4,-51.7,52.9C-64.9,38.4,-72.2,19.2,-70.1,2.2C-67.9,-14.9,-56.2,-29.7,-43,-41.1C-29.7,-52.5,-14.9,-60.3,0.3,-60.6C15.4,-60.9,30.8,-53.6,45.9,-42.2Z",
        "M48.8,-50.5C62.9,-34.8,73.5,-17.4,76.6,3.1C79.7,23.6,75.2,47.1,61.1,62.1C47.1,77,23.6,83.3,1.3,82C-21,80.7,-41.9,71.8,-56.9,56.9C-71.9,41.9,-80.9,21,-81.1,-0.2C-81.4,-21.4,-72.8,-42.8,-57.8,-58.5C-42.8,-74.3,-21.4,-84.4,-2,-82.4C17.4,-80.3,34.8,-66.3,48.8,-50.5Z",
        "M54.6,-53.7C69.7,-39.5,80.1,-19.7,80.7,0.5C81.2,20.8,71.7,41.5,56.6,56.1C41.5,70.6,20.8,78.9,-0.7,79.7C-22.3,80.4,-44.5,73.6,-60.9,59.1C-77.2,44.5,-87.6,22.3,-87.1,0.5C-86.6,-21.2,-75.1,-42.4,-58.7,-56.5C-42.4,-70.7,-21.2,-77.9,-0.7,-77.2C19.7,-76.4,39.5,-67.8,54.6,-53.7Z"
    ]

    const svgRef = useRef<SVGSVGElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const scaleTlRef = useRef<gsap.core.Timeline | null>(null);

    useEffect(() => {
        gsap.registerPlugin(MorphSVGPlugin);

        if (!svgRef.current || !pathRef.current) return;

        const masterTl = gsap.timeline()

        const pathTl = () => {
            return gsap.timeline({ repeat: -1, yoyo: true }).to(pathRef.current, {
                duration: 1.5,
                ease: "none",
                morphSVG: paths[0],
            }).to(pathRef.current, {
                duration: 1.5,
                ease: "none",
                morphSVG: paths[1],
            }).to(pathRef.current, {
                duration: 1.5,
                ease: "none",
                morphSVG: paths[2],
            }).to(pathRef.current, {
                duration: 1.5,
                ease: "none",
                morphSVG: paths[3],
            })
        }

        const svgTl = () => {
            return gsap.timeline({ repeat: -1, yoyo: true }).to(svgRef.current, {
                rotate: 360,
                duration: paths.length * 2,
                ease: "none",
            });
        }

        scaleTlRef.current = gsap.timeline({ paused: true }).to(svgRef.current, {
            scale: 4,
            duration: 4,
            ease: 'expo.inOut',
        });

        masterTl.add(pathTl());
        masterTl.add(svgTl(), 0);

        masterTl.play();


        return () => {
            masterTl.kill();
            scaleTlRef.current?.kill();
        }

    }, [])


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
                <button className="underline decoration-2 cursor-pointer underline-offset-3" onClick={() => scaleTlRef.current?.play()}>Enter</button>
            </div>

        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-50 h-50 pointer-events-none">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" ref={svgRef}>
                <path ref={pathRef} fill="white" d="M55.3,-58.4C68.6,-41.9,74.3,-21,73.3,-1.1C72.2,18.8,64.4,37.7,51,50.8C37.7,64,18.8,71.5,-1.4,72.9C-21.6,74.3,-43.3,69.6,-58.6,56.5C-74,43.3,-83,21.6,-82.8,0.3C-82.5,-21.1,-73,-42.3,-57.6,-58.7C-42.3,-75.2,-21.1,-86.9,-0.1,-86.8C21,-86.7,41.9,-74.8,55.3,-58.4Z" transform="translate(100 100)" />
            </svg>
        </div>
    </div>
}

export default ConsentScreen;