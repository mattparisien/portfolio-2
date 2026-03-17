"use client";

interface ColorButtonProps {
  color: string;
  title?: string;
  onChange: (c: string) => void;
  size?: number;
}

/** A circular color swatch that opens the native OS color picker on click.
 *  Uses a <label>+hidden-input pattern so it works consistently across browsers. */
export default function ColorButton({ color, title = "Color", onChange, size = 24 }: ColorButtonProps) {
  return (
    <label
      title={title}
      className="rounded-full cursor-pointer block flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: "0 0 0 1.5px rgba(0,0,0,0.15), 0 0 0 3px #fff, 0 0 0 4.5px rgba(0,0,0,0.12)",
      }}
    >
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="opacity-0 w-0 h-0 absolute pointer-events-none"
        tabIndex={-1}
      />
    </label>
  );
}
