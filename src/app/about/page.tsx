'use client'
import { useSplitText } from "../hooks/useSplitText";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import classNames from "classnames";

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
  

    return <div className="w-screen h-screen bg-[#F6F6F6] flex items-center justify-center">
        <div className={classNames("text-[5vw] rounded-full pb-1 pl-2 pr-3 pb-2 cursor-pointer border rounded-full leading-none  hover:bg-[var(--current-color)]", {
            "border-[var(--current-color)]": isMouseEntered,
            "border-black": !isMouseEntered,
        })}
            // ref={splitTextRef}
            onMouseEnter={() => {
                setHoverCount((c) => c + 1);
                setIsMouseEntered(true);
            }}
            onMouseLeave={() => setIsMouseEntered(false)}
            style={{
                                "--current-color": PALETTE[hoverCount % PALETTE.length],

            }}
        >
            <div className="logo text-black" style={{
                fontFamily:"Waldeck",
            }}>CRUMB</div>
        </div>
    </div>
}

export default Page;