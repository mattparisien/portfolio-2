import classNames from "classnames";
import { forwardRef, useContext } from "react";
import useAspect from "@/app/hooks/useAspect";
import { SuperGridContext } from "./SuperGrid";

interface SuperGridItemProps {  
    image: {
        url: string;
    };
    addToRefArray: (node: HTMLDivElement | null) => void;
    width: string;
    margin: string;
    offset: string;
    speed?: number;
}

function SuperGridItem({ image, addToRefArray, width, margin, offset, speed = 1 }: SuperGridItemProps) {
    const context = useContext(SuperGridContext);
    const enableParallax = context?.enableParallax ?? false;
    const aspect = useAspect(image.url);

    const classes = classNames(
        "SuperGridItem relative overflow-hidden before:block rounded-lg px-2",
        {
            "before:pb-[125%]": aspect === "portrait",
            "before:pb-[70%]": aspect === "landscape",
            "before:pb-[100%]": aspect === null, // Default square until loaded
            [width]: width,
            [margin]: margin,
            [offset]: offset,
        }
    );

    const imgClasses = classNames("SuperGridImage w-full h-full object-contain rounded-lg");

    const containerClasses = classNames("absolute bottom-0 left-0 w-full", {
        "h-[120%]": enableParallax,
        "h-full": !enableParallax,
    });

    return (
        <figure
            className={classes}
            data-aspect={aspect}
            data-scroll
            data-scroll-speed={speed}
            data-scroll-delay={0.05}
            ref={addToRefArray}
        >
            <div className={containerClasses}>
                <img className={imgClasses} src={image.url} alt="" />
            </div>
        </figure>
    );
}

export default forwardRef(SuperGridItem);
