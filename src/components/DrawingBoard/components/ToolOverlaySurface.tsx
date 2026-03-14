import { forwardRef } from "react";
import OverlaySurface from "@/components/OverlaySurface";

const ToolOverlaySurface = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string, style?: React.CSSProperties }>(
    ({ children, className, style }, ref) => (
        <OverlaySurface
            ref={ref}
            className={`flex items-center gap-2 p-2 z-[200] ${className}`}
            style={style}
            rounded
            boxShadow
            borderTop
            borderBottom
            borderLeft
            borderRight
        >
            {children}
        </OverlaySurface>
    )
);

ToolOverlaySurface.displayName = "ToolOverlaySurface";

export default ToolOverlaySurface;