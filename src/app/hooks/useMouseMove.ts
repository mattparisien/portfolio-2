import { useEffect, useRef, useState } from "react";

interface MousePosition {
  x: number;
  y: number;
  /** Normalized 0–1 across the viewport width */
  nx: number;
  /** Normalized 0–1 across the viewport height */
  ny: number;
}

const DEFAULT: MousePosition = { x: 0, y: 0, nx: 0, ny: 0 };

export function useMouseMove(): MousePosition {
  const [position, setPosition] = useState<MousePosition>(DEFAULT);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current !== null) return;

      rafRef.current = requestAnimationFrame(() => {
        setPosition({
          x: e.clientX,
          y: e.clientY,
          nx: e.clientX / window.innerWidth,
          ny: e.clientY / window.innerHeight,
        });
        rafRef.current = null;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return position;
}
