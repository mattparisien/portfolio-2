'use client'

import { useEffect, useRef } from "react";
import gsap from "gsap";
import MorphSVGPlugin from "gsap/MorphSVGPlugin";

const PATHS = [
        "M53.9,-58.6C65.5,-42.4,67.4,-21.2,66,-1.4C64.6,18.4,59.9,36.8,48.3,51.5C36.8,66.3,18.4,77.4,0.8,76.5C-16.8,75.7,-33.5,63,-49.9,48.3C-66.3,33.5,-82.3,16.8,-84.6,-2.3C-86.9,-21.3,-75.4,-42.7,-59.1,-58.9C-42.7,-75.1,-21.3,-86.1,-0.1,-86.1C21.2,-86,42.4,-74.8,53.9,-58.6Z",
        "M45.9,-42.2C60.9,-30.8,75.6,-15.4,75.7,0.1C75.8,15.7,61.4,31.3,46.4,45.8C31.3,60.3,15.7,73.6,-1.8,75.4C-19.2,77.2,-38.4,67.4,-51.7,52.9C-64.9,38.4,-72.2,19.2,-70.1,2.2C-67.9,-14.9,-56.2,-29.7,-43,-41.1C-29.7,-52.5,-14.9,-60.3,0.3,-60.6C15.4,-60.9,30.8,-53.6,45.9,-42.2Z",
        "M59.6,-60.8C73.6,-45.6,78.9,-22.8,79.1,0.2C79.2,23.1,74.3,46.3,60.3,57C46.3,67.8,23.1,66.2,3.5,62.7C-16.1,59.3,-32.3,53.8,-46.9,43.1C-61.5,32.3,-74.5,16.1,-75.4,-0.9C-76.4,-18,-65.2,-36,-50.6,-51.3C-36,-66.5,-18,-78.9,2.4,-81.3C22.8,-83.7,45.6,-76,59.6,-60.8Z",
        "M48.8,-50.5C62.9,-34.8,73.5,-17.4,76.6,3.1C79.7,23.6,75.2,47.1,61.1,62.1C47.1,77,23.6,83.3,1.3,82C-21,80.7,-41.9,71.8,-56.9,56.9C-71.9,41.9,-80.9,21,-81.1,-0.2C-81.4,-21.4,-72.8,-42.8,-57.8,-58.5C-42.8,-74.3,-21.4,-84.4,-2,-82.4C17.4,-80.3,34.8,-66.3,48.8,-50.5Z",
        "M54.6,-53.7C69.7,-39.5,80.1,-19.7,80.7,0.5C81.2,20.8,71.7,41.5,56.6,56.1C41.5,70.6,20.8,78.9,-0.7,79.7C-22.3,80.4,-44.5,73.6,-60.9,59.1C-77.2,44.5,-87.6,22.3,-87.1,0.5C-86.6,-21.2,-75.1,-42.4,-58.7,-56.5C-42.4,-70.7,-21.2,-77.9,-0.7,-77.2C19.7,-76.4,39.5,-67.8,54.6,-53.7Z",
        "M47.5,-50.5C58.8,-36.2,63.5,-18.1,64.5,1C65.5,20.1,62.8,40.2,51.5,54.7C40.2,69.3,20.1,78.4,0.4,78C-19.2,77.6,-38.4,67.6,-52.8,53C-67.1,38.4,-76.6,19.2,-76.1,0.5C-75.6,-18.2,-65.1,-36.4,-50.8,-50.8C-36.4,-65.2,-18.2,-75.7,-0.1,-75.6C18.1,-75.6,36.2,-64.9,47.5,-50.5Z"
];

const ConsentScreen = () => {
    const splitTextRef = useRef<HTMLDivElement>(null);

    const blobGroupRef = useRef<SVGGElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const scaleTlRef = useRef<gsap.core.Timeline | null>(null);

    useEffect(() => {
        gsap.registerPlugin(MorphSVGPlugin);

        if (!blobGroupRef.current || !pathRef.current) return;

        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const coverScale = Math.ceil(Math.hypot(window.innerWidth, window.innerHeight) / 80);
        gsap.set(blobGroupRef.current, { x: cx, y: cy, transformOrigin: '0px 0px' });

        const masterTl = gsap.timeline();

        const pathTl = () => {
            return gsap.timeline({ repeat: -1, yoyo: true })
                .to(pathRef.current, { duration: 1.5, ease: "none", morphSVG: PATHS[0] })
                .to(pathRef.current, { duration: 1.5, ease: "none", morphSVG: PATHS[1] })
                .to(pathRef.current, { duration: 1.5, ease: "none", morphSVG: PATHS[2] })
                .to(pathRef.current, { duration: 1.5, ease: "none", morphSVG: PATHS[3] });
        };

        const svgTl = () => {
            return gsap.timeline({ repeat: -1 }).to(blobGroupRef.current, {
                rotation: 360,
                duration: PATHS.length * 2,
                ease: "none",
            });
        };

        scaleTlRef.current = gsap.timeline({ paused: true }).to(blobGroupRef.current, {
            scale: coverScale,
            duration: 4,
            ease: 'expo.inOut',
        });

        masterTl.add(pathTl());
        masterTl.add(svgTl(), 0);
        masterTl.play();

        return () => {
            masterTl.kill();
            scaleTlRef.current?.kill();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-10 overflow-hidden">
            <style jsx>
                {`
                    body {
                        display: none;
                    }
                `}
            </style>
            {/*
              Single SVG covers the viewport.
              The mask punches a blob-shaped hole through the entire group,
              which includes the teal rect AND the foreignObject text — so
              both get clipped together and the DrawingBoard shows through the hole.
            */}
            <svg
                className="absolute inset-0 w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
                style={{ overflow: 'visible' }}
            >
                <defs>
                    <mask id="blob-mask">
                        <rect width="100%" height="100%" fill="white" />
                        <g ref={blobGroupRef}>
                            <path
                                ref={pathRef}
                                fill="black"
                                d="M55.3,-58.4C68.6,-41.9,74.3,-21,73.3,-1.1C72.2,18.8,64.4,37.7,51,50.8C37.7,64,18.8,71.5,-1.4,72.9C-21.6,74.3,-43.3,69.6,-58.6,56.5C-74,43.3,-83,21.6,-82.8,0.3C-82.5,-21.1,-73,-42.3,-57.6,-58.7C-42.3,-75.2,-21.1,-86.9,-0.1,-86.8C21,-86.7,41.9,-74.8,55.3,-58.4Z"
                            />
                        </g>
                    </mask>
                </defs>
                <g mask="url(#blob-mask)">
                    <rect width="100%" height="100%" fill="#0ba585" />
                    <foreignObject x="0" y="0" width="100%" height="100%">
                        <div
                            className="w-full h-full flex flex-col items-start justify-between p-2"
                        >
                            <div
                                className="font-mono text-[4.5vw] tracking-tight leading-[1.1] text-[#141414]"
                                ref={splitTextRef}
                            >
                                <span>Crumb is an infinite digital canvas for the queer community \u2014 a space for expression, creativity, and connection. You\u2019re free to contribute anything, as long as it is respectful, non-harmful, and helps keep Crumb safe and welcoming for everyone.</span>
                                <button
                                    className="underline decoration-2 cursor-pointer underline-offset-3"
                                    onClick={() => scaleTlRef.current?.play()}
                                >
                                    Enter
                                </button>
                            </div>
                        </div>
                    </foreignObject>
                </g>
            </svg>
        </div>
    );
}

export default ConsentScreen;
