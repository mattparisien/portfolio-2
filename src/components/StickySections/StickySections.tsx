'use client';
import { MediaItem } from "@/app/page";
import { useEffect, useRef } from "react";
import { PALETTE } from "@/app/constants";
import classNames from "classnames";

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
    // Keep a stable ref to items so the scroll handler always sees the latest list
    const itemsRef = useRef(items);
    itemsRef.current = items;

    useEffect(() => {
        if (!items || items.length === 0) return;

        const update = () => {
            const vh = window.innerHeight;
            const scrollY = window.scrollY;

            panelRefs.current.forEach((panel, i) => {
                if (!panel) return;

                const item = itemsRef.current[i];
                const isScale = item?.meta?.transform === 'scale';

                // Each panel gets one full vh of scroll space to animate in.
                // Panel i starts at scroll position i * vh and lands at (i+1) * vh.
                const start = i * vh;
                const end = (i + 1) * vh;
                const progress = Math.min(1, Math.max(0, (scrollY - start) / (end - start)));

                if (isScale) {
                    panel.style.transform = `scale(${progress})`;
                    // panel.style.opacity = String(progress);
                } else {
                    panel.style.transform = `translateY(${(1 - progress) * 100}%)`;
                    // panel.style.opacity = '1';
                }
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

            {items.map((item, i) => {



                const isScale = item?.meta?.transform === 'scale';
                const bgColor =  (isScale || item.meta?.removeBackground === "true") ? "transparent" : PALETTE[i % PALETTE.length];

                return (
                    <div
                        key={i}
                        ref={el => { panelRefs.current[i] = el; }}
                        className="flex items-center justify-center rounded-t-xl pointer-events-auto"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100vh',
                            zIndex: i + 1,
                            // Scale items start invisible at full size centre;
                            // slide items start fully below the viewport.
                            transform: isScale ? 'scale(0)' : 'translateY(100%)',
                            // opacity: isScale ? 0 : 1,
                            transformOrigin: 'center center',
                            willChange: 'transform, opacity',
                            backgroundColor: bgColor,
                        }}
                    >

                        <div className={classNames("rounded-md overflow-hidden inline-flex", {
                            "w-full h-full": item.meta?.isFullScreen == "true",
                        })} style={{
                            width: item.meta?.isFullScreen === "true" ? "100%" : "auto",
                            height: item.meta?.isFullScreen === "true" ? "100%" : "auto",
                            maxWidth: item.meta?.isFullScreen === "true" ? "100%" : '90vw',
                            maxHeight: item.meta?.isFullScreen === "true" ? "100%" : '90vh',
                            transform: `rotate(${item.meta?.rotate ? item.meta.rotate : 0}deg)`,
                        }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={item.url}
                                className={classNames({
                                    "w-full h-full object-cover": item.meta?.isFullScreen == "true",
                                })}
                                alt=""
                                loading={i < 3 ? "eager" : "lazy"}
                                decoding="async"
                                style={{
                                    backfaceVisibility: "hidden",
                                    transform: "translateZ(0)",
                                    maxWidth: item.meta?.isFullScreen === "true" ? "100%" : "90vw",
                                    maxHeight: item.meta?.isFullScreen === "true" ? "100%" : "90vh",
                                    width: item.meta?.isFullScreen === "true" ? "100%" : "auto",
                                    height: item.meta?.isFullScreen === "true" ? "100%" : "auto"
                                }}
                            />
                        </div>


                    </div>
                );
            })}
        </>
    );
};

export default StickySections;
