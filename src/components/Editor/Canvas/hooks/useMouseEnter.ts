import { useEffect, useState, RefObject } from "react";

export function useMouseEnter(ref: RefObject<HTMLElement | null>) {
    const [isMouseEntered, setIsMouseEntered] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const handleEnter = () => setIsMouseEntered(true);
        const handleLeave = () => setIsMouseEntered(false);

        el.addEventListener("mouseenter", handleEnter);
        el.addEventListener("mouseleave", handleLeave);

        return () => {
            el.removeEventListener("mouseenter", handleEnter);
            el.removeEventListener("mouseleave", handleLeave);
        };
    }, [ref]);

    return isMouseEntered;
}
