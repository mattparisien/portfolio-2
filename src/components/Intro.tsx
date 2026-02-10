import { useEffect, useMemo, useRef } from "react";
import { MediaGridItem } from "./StickySections/StickySections"
import { PALETTE } from "@/app/constants";
import gsap from "gsap";

interface IntroProps {
    items: MediaGridItem[];
}

const Intro = ({ items }: IntroProps) => {

    const introItems = useMemo(() => {
        return items.slice(0, 4);
    }, [items])

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const loadImages = async (items: MediaGridItem[]): Promise<HTMLImageElement[]> => {
        const promiseArray = items.map(item => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = item.url;
            });
        });

        return Promise.all(promiseArray);
    }

    useEffect(() => {
        if (canvasRef.current) {
            const cnv = canvasRef.current;
            const ctx = cnv.getContext("2d");
            let animationId: number;
            let params = {
                scale: 1,
                activeIdx: 0,
                color: PALETTE[0],
                colorOpacity: 1,
                scaleX: 1,
                scaleY: 1
            }

            const intervalDuration = 2000; // 2 seconds

            cnv.width = window.innerWidth;
            cnv.height = window.innerHeight;

            if (!ctx) return;

            const animate = (loadedImages: HTMLImageElement[]) => {
                // Clear canvas each frame
                ctx.clearRect(0, 0, cnv.width, cnv.height);

                const containerWidth = 200 * params.scale;
                const containerHeight = 200 * params.scale;

                const width = containerWidth * params.scaleX;
                const height = containerHeight * params.scaleY;

                const x = window.innerWidth / 2 - width / 2;
                const y = window.innerHeight / 2 - height / 2;
                
                // Draw debug background
                ctx.fillStyle = "red";
                ctx.fillRect(x, y, width, height);
                
                const image = loadedImages[params.activeIdx];
                const item = introItems[params.activeIdx];
                
                // Calculate image dimensions to fit inside container (contain behavior)
                let imageWidth, imageHeight;
                const containerAspect = width / height;
                
                if (item.aspectRatio > containerAspect) {
                    // Image is wider than container - fit to width
                    imageWidth = width;
                    imageHeight = imageWidth / item.aspectRatio;
                } else {
                    // Image is taller than container - fit to height
                    imageHeight = height;
                    imageWidth = imageHeight * item.aspectRatio;
                }
                
                const imageX = window.innerWidth / 2 - imageWidth / 2;
                const imageY = window.innerHeight / 2 - imageHeight / 2;
                ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);
                
                // Draw color overlay
                ctx.fillStyle = params.color;
                ctx.globalAlpha = params.colorOpacity;
                ctx.fillRect(imageX, imageY, imageWidth, imageHeight);
                ctx.globalAlpha = 1; // Reset alpha

                animationId = requestAnimationFrame(() => animate(loadedImages));
            }

            const getScale = (item: MediaGridItem) => {
                let scaleX = 1;
                let scaleY = 1;

                if (item.aspectRatio <= 1) {
                    // Portrait
                    scaleX = (200 * params.scale) / (200 * item.aspectRatio);
                } else {
                    // Landscape
                    scaleY = (200 * params.scale) / (200 / item.aspectRatio);
                }

                return { scaleX, scaleY };
            }

            const animateScale = () => {
                const { scaleX, scaleY } = getScale(introItems[params.activeIdx]);

                gsap.to(params, {
                    scaleX: scaleX,
                    scaleY: scaleY,
                    color: PALETTE[params.activeIdx],
                    duration: 1,
                    ease: "power3.inOut",
                    onComplete: () => {
                        params.activeIdx = params.activeIdx + 1;

                        if (params.activeIdx <= introItems.length - 1) {

                            animateScale();
                        } else {
                            // Scale to window width and height
             
                            gsap.to(params, {
                                scaleX: window.innerWidth / (200 * params.scale),
                                scaleY: window.innerHeight / (200 * params.scale),
                                duration: 1,
                                ease: "power3.inOut",
                            })
                        }
                    }
                })
            }

            // const setInitialScale = () => {
            //     const { scaleX, scaleY } = getScale(introItems[params.activeIdx]);

            //     gsap.to(params, {
            //         scaleX: scaleX,
            //         scaleY: scaleY,
            //         duration: 1,
            //         ease: "expo.inOut",
            //     })
            //     params.activeIdx = params.activeIdx + 1;
            // }


            loadImages(introItems).then((loadedImages) => {
                animate(loadedImages);

                setInterval(() => {
                        params.colorOpacity = 1;
                        params.activeIdx = (params.activeIdx + 1) % introItems.length;
                        params.color = PALETTE[params.activeIdx];
                        gsap.to(params, {
                            colorOpacity: 0,
                            duration: 2,
                            ease: "power3.out"
                        })
                }, intervalDuration);
                // setInitialScale();


                // setTimeout(() => {
                //     animateScale();

                // }, 3000);


                // gsap.to(params, {
                //     scale: 0.5,
                //     duration: 1,
                // })
            });

            // Cleanup on unmount
            return () => {
                if (animationId) {
                    cancelAnimationFrame(animationId);
                }
            };
        }
    }, [introItems])

    return <div className="w-screen h-screen fixed top-0 left-0 z-10 bg-black">
        <canvas ref={canvasRef}></canvas>
    </div>
}

export default Intro;