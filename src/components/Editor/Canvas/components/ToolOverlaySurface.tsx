import { forwardRef } from "react";
import OverlaySurface from "@/components/OverlaySurface";

const ToolOverlaySurface = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string, direction?: "horizontal" | "vertical", style?: React.CSSProperties }>(
    ({ children, className, direction = "horizontal", style }, ref) => (
        <OverlaySurface
            ref={ref}
            className={`flex flex-col items-center justify-between !bg-neutral-100 ${className}`}
            style={{ zIndex: 150, ...style }}
            roundedTopLeft
            roundedBottomLeft
            direction={direction}
        >
            {children}
        </OverlaySurface>
    )
);

ToolOverlaySurface.displayName = "ToolOverlaySurface";

export default ToolOverlaySurface;