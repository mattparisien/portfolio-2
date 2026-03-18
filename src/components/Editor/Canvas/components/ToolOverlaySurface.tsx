import { forwardRef } from "react";
import OverlaySurface from "@/components/OverlaySurface";

export type ToolOverlaySurfaceVariant = "default" | "white";

interface ToolOverlaySurfaceProps {
  children: React.ReactNode;
  className?: string;
  direction?: "horizontal" | "vertical";
  style?: React.CSSProperties;
  /** Use all-corner rounding (floating toolbar). Defaults to left-only rounding (edge-attached toolbar). */
  rounded?: boolean;
  /**
   * "default" — neutral-100 gray background (canvas toolbar)
   * "white"   — white background with a border (property toolbar)
   */
  variant?: ToolOverlaySurfaceVariant;
}

const variantClass: Record<ToolOverlaySurfaceVariant, string> = {
  default: "!bg-neutral-100",
  white:   "!bg-white border border-black/[0.09]",
};

const ToolOverlaySurface = forwardRef<HTMLDivElement, ToolOverlaySurfaceProps>(
  ({ children, className, direction = "vertical", style, rounded = false, variant = "default" }, ref) => (
    <OverlaySurface
      ref={ref}
      className={`items-center ${variantClass[variant]} ${className ?? ""}`}
      style={{ zIndex: 150, ...style }}
      direction={direction}
      {...(rounded
        ? { rounded: true }
        : { roundedTopLeft: true, roundedBottomLeft: true })}
    >
      {children}
    </OverlaySurface>
  )
);

ToolOverlaySurface.displayName = "ToolOverlaySurface";

export default ToolOverlaySurface;