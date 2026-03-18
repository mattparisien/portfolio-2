import { forwardRef } from "react";
import ToolOverlaySurface, { type ToolOverlaySurfaceVariant } from "./ToolOverlaySurface";

interface ToolbarContainerProps {
  children: React.ReactNode;
  /** Horizontal (top/bottom bar) or vertical (side rail). Default: "horizontal". */
  direction?: "horizontal" | "vertical";
  /**
   * "default" — neutral-100 gray background (canvas toolbar)
   * "white"   — white background with a border (property toolbar)
   */
  variant?: ToolOverlaySurfaceVariant;
  /** Extra Tailwind/utility classes for layout & positioning. */
  className?: string;
  style?: React.CSSProperties;
  /**
   * "floating" — fully rounded (all corners).
   * "edge"     — rounded on the inward side only (attached to a viewport edge).
   * Default: "floating".
   */
  shape?: "floating" | "edge";
}

/**
 * Generic toolbar shell consumed by every toolbar in the canvas editor.
 * Provides consistent sizing, rounding, background variant, and shadow.
 */
const ToolbarContainer = forwardRef<HTMLDivElement, ToolbarContainerProps>(
  (
    {
      children,
      direction = "horizontal",
      variant = "default",
      className = "",
      style,
      shape = "floating",
    },
    ref
  ) => (
    <ToolOverlaySurface
      ref={ref}
      direction={direction}
      variant={variant}
      rounded={shape === "floating"}
      className={className}
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        ...style,
      }}
    >
      {children}
    </ToolOverlaySurface>
  )
);

ToolbarContainer.displayName = "ToolbarContainer";

export default ToolbarContainer;
