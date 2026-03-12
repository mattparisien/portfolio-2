'use client'
import { useState } from "react";
import classNames from "classnames";
import Link from "next/link";

const PALETTE = [
    "#00CC66",
    "#ffbbff",
    "#f36",
    "#7C4F48",
    "#7B48A2"
]

const Page = () => {
    
    const [hoverCount, setHoverCount] = useState(0);
    const [isMouseEntered, setIsMouseEntered] = useState(false);
  

    return <div className="w-screen h-screen bg-[#F6F6F6] flex flex-col items-center justify-center gap-10 px-6">
        <div className={classNames("text-[5vw] rounded-full pb-1 pl-2 pr-3 pb-2 cursor-pointer border rounded-full leading-none hover:bg-[var(--current-color)]", {
            "border-[var(--current-color)]": isMouseEntered,
            "border-black": !isMouseEntered,
        })}
            onMouseEnter={() => {
                setHoverCount((c) => c + 1);
                setIsMouseEntered(true);
            }}
            onMouseLeave={() => setIsMouseEntered(false)}
            style={{
                "--current-color": PALETTE[hoverCount % PALETTE.length],
            } as React.CSSProperties}
        >
            <div className="logo text-black" style={{ fontFamily: "Waldeck" }}>CRUMB</div>
        </div>

        <div className="max-w-md text-center space-y-3">
            <p className="text-[13px] text-gray-500 leading-relaxed tracking-wide">
                Crumb is an infinite collaborative canvas — a queer collective space where anyone can draw, doodle, and leave their mark.
            </p>
            <p className="text-[13px] text-gray-500 leading-relaxed tracking-wide">
                The wall is always open. Pull up a brush, find a corner, and make something with us.
            </p>
        </div>

        <Link
            href="/"
            className="text-[11px] font-mono tracking-widest uppercase text-gray-400 hover:text-black transition-colors duration-200"
        >
            Enter the canvas →
        </Link>
    </div>
}

export default Page;