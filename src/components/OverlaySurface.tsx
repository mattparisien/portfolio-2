import { forwardRef } from "react";
import classNames from "classnames";

interface FloatingPanelProps {
    children: React.ReactNode;
    className?: string;
    boxShadow?: boolean;
    borderTop?: boolean;
    borderLeft?: boolean;
    borderRight?: boolean;
    borderBottom?: boolean;
    rounded?: boolean;
    roundedTopLeft?: boolean;
    roundedTopRight?: boolean;
    roundedBottomLeft?: boolean;
    roundedBottomRight?: boolean;
    onPointerOver?: React.PointerEventHandler<HTMLDivElement>;
    style?: React.CSSProperties;
}

const OverlaySurface = forwardRef<HTMLDivElement, FloatingPanelProps>(
    ({ children, className, boxShadow = false, borderTop = false, borderLeft = false, borderRight = false, borderBottom = false, rounded = false, roundedTopLeft = false, roundedTopRight = false, roundedBottomLeft = false, roundedBottomRight = false, style, onPointerOver }, ref) => (
        <div
            ref={ref}
            className={classNames("drawing-ui-overlay z-[300] bg-overlay-bg", className, {
                "border-t border-neutral-200": borderTop,
                "border-l border-neutral-200": borderLeft,
                "border-r border-neutral-200": borderRight,
                "border-b border-neutral-200": borderBottom,
                "rounded-xl": rounded,
                "rounded-tl-xl": roundedTopLeft,
                "rounded-tr-xl": roundedTopRight,
                "rounded-bl-xl": roundedBottomLeft,
                "rounded-br-xl": roundedBottomRight,
            })}
            onPointerOver={onPointerOver}
            style={{
                ...(boxShadow ? { boxShadow: "0 4px 12px rgba(0,0,0,0.1)" } : {}),
                ...style,
            }}
        >
            {children}
        </div>
    )
);

OverlaySurface.displayName = "OverlaySurface";

export default OverlaySurface;
