'use client';
import { MediaItem } from "@/app/page";
import { useEffect, useRef } from "react";

interface MediaGridProps {
    items: MediaGridItem[];
    isActive: boolean;
}

export type MediaGridItem = MediaItem & {
    width: number | null;
    height: number | null;
    aspectRatio: number | null;
    meta?: {
        isFullScreen?: "true" | "false";
        removeBackground?: "true" | "false";
        rotate?: string;
        context?: string;
        transform?: "scale";
    };
};

const StickySections = ({ items }: MediaGridProps) => {
    const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (!items || items.length === 0) return;

        const update = () => {
            const vh = window.innerHeight;
            const scrollY = window.scrollY;

            panelRefs.current.forEach((panel, i) => {
                if (!panel) return;

                // Each panel gets one full vh of scroll space to slide in.
                // Panel i starts entering at scroll position i * vh
                // and fully lands at (i + 1) * vh.
                const start = i * vh;
                const end = (i + 1) * vh;

                const progress = Math.min(1, Math.max(0, (scrollY - start) / (end - start)));
                panel.style.transform = `translateY(${(1 - progress) * 100}%)`;
            });
        };

        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();

        return () => {
            window.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [items]);

    return (
        <>
            {/* Provides scroll space: one vh per panel to slide in, plus one vh to view the last panel */}
            <div style={{ height: `${(items.length + 1) * 100}vh` }} />

            {items.map((item, i) => (
                <div
                    key={i}
                    ref={el => { panelRefs.current[i] = el; }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100vh',
                        // Later panels sit on top of earlier ones
                        zIndex: i + 1,
                        // Start fully below the viewport
                        transform: 'translateY(100%)',
                        willChange: 'transform',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                </div>
            ))}
        </>
    );
};

export default StickySections;
