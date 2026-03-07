"use client";
import StickySections from "@/components/StickySections/StickySections";
import Button from "@/components/Button/Button";
import { useEffect, useState } from "react";
import { shuffle } from "@/app/helpers";
import { SHUFFLE_SEED, CONTACT_EMAIL } from "@/app/constants";
import type { MediaItem } from "@/types/media";

// Re-export for components that still import MediaItem from here
export type { MediaItem };

export default function Home() {
  const [media, setMedia] = useState<MediaItem[]>([]);

  // Fetch and preload media from Cloudinary folder
  useEffect(() => {
    const fetchAndPreloadMedia = async () => {
      try {
        const response = await fetch("/api/cloudinary-images");
        const data = await response.json();
        const mediaItems: MediaItem[] = data.media || [];

        // Shuffle with a fixed seed so the gallery order is consistent across visits
        setMedia(shuffle(mediaItems, SHUFFLE_SEED));

        // Preload all media assets in the background
        const preloadPromises = mediaItems.map((item) =>
          new Promise<string>((resolve, reject) => {
            if (item.type === "image") {
              const img = new Image();
              img.onload = () => resolve(item.url);
              img.onerror = () =>
                reject(new Error(`Failed to load ${item.url}`));
              img.src = item.url;
            } else if (item.type === "video") {
              const video = document.createElement("video");
              video.onloadeddata = () => resolve(item.url);
              video.onerror = () =>
                reject(new Error(`Failed to load ${item.url}`));
              video.src = item.url;
              video.preload = "metadata";
            } else {
              resolve(item.url);
            }
          })
        );

        await Promise.allSettled(preloadPromises);
      } catch (error) {
        console.error("Error fetching media:", error);
        setMedia([]);
      }
    };

    fetchAndPreloadMedia();
  }, []);

  const proseStyle = {
    fontFamily: "Freigeist, sans-serif",
    fontWeight: "300",
  };

  return (
    <>
      <main
        style={
          {
            minHeight: "100dvh",
            WebkitMinHeight: "-webkit-fill-available",
          } as React.CSSProperties
        }
        data-scroll-container
      >
        <div className="flex flex-col justify-between items-start w-screen h-[100dvh] fixed top-0 left-0 sm:px-8 sm:py-5 px-4 py-3 bg-[#FC79C8]">
          <h2
            className="text-black leading-[1.24] text-[1.4rem] sm:text-[clamp(1.7rem,3vw,3rem)]"
            style={proseStyle}
          >
            <Button href="">Matthew Parisien</Button> (1997, Montreal) is a
            software developer and visual artist working at the intersection of
            engineering and design. He builds digital systems and tools where
            creative thinking informs not just aesthetics, but structure,
            usability, and execution.

            With a background that spans data-driven development and years
            leading a creative studio, working for brands such as Lush Cosmetics
            and Sephora. Matthew approaches engineering as a creative
            practice—translating abstract ideas into clear, scalable systems and
            collaborating seamlessly across technical and creative teams. He is
            currently working in data engineering at{" "}
            <Button href="https://www.innocap.com/en/media/">Innocap</Button>{" "}
            and is a member of{" "}
            <Button href="https://creamworldwide.com/">Cream Creators.</Button>{" "}
            When he&apos;s not wrangling data, he&apos;s probably making art,
            overthinking color palettes, or spending time with his dog Ollie.
            Scroll to see creative work.
          </h2>

          <div
            className="flex items-center justify-between w-full [&>a]:cursor-pointer [&>a]:decoration-[2px] [&>a]:decoration-black [&>a]:underline-offset-2 [&>a]:hover:underline"
            style={{ ...proseStyle, fontWeight: 400 }}
          >
            <div className="text-sm sm:text-lg md:text-xl font-sans">
              Matthew Parisien *
            </div>
            <a
              className="text-sm sm:text-lg text-lg md:text-xl font-sans"
              href={`mailto:${CONTACT_EMAIL}`}
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>

        {media.length > 0 && <StickySections items={media} isActive={false} />}
      </main>
    </>
  );
}
