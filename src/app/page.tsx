"use client"
import Grid from '@/components/Grid';
import Intro from '@/components/Intro';
import StickySections from '@/components/StickySections/StickySections';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
  format: string;
}

// Simple seeded random generator (mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher–Yates shuffle with seed
function shuffle(array: unknown[], seed: number) {
  const random = mulberry32(seed);
  const arr = array.slice(); // copy so original isn’t mutated
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isGridActive, setIsGridActive] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);

  // Embla Carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    slidesToScroll: 1,
    containScroll: 'trimSnaps'
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onScroll = () => {
      setScrollProgress(emblaApi.scrollProgress());
    };

    emblaApi.on('scroll', onScroll);
    onScroll();

    return () => {
      emblaApi.off('scroll', onScroll);
    };
  }, [emblaApi, setScrollProgress]);

  // Fetch and preload media from Cloudinary folder
  useEffect(() => {
    const fetchAndPreloadMedia = async () => {
      try {
        const response = await fetch('/api/cloudinary-images');
        const data = await response.json();
        const mediaItems = data.media || [];

        // Set media state first
        setMedia(shuffle(mediaItems, 125) as MediaItem[]); // Shuffle with fixed seed for consistent order

        // Preload all media in background
        const preloadPromises = mediaItems.map((item: MediaItem) => {
          return new Promise((resolve, reject) => {
            if (item.type === 'image') {
              const img = new Image();
              img.onload = () => resolve(item.url);
              img.onerror = () => reject(new Error(`Failed to load ${item.url}`));
              img.src = item.url;
            } else if (item.type === 'video') {
              const video = document.createElement('video');
              video.onloadeddata = () => resolve(item.url);
              video.onerror = () => reject(new Error(`Failed to load ${item.url}`));
              video.src = item.url;
              video.preload = 'metadata';
            } else {
              resolve(item.url);
            }
          });
        });

        // Wait for all media to preload
        await Promise.allSettled(preloadPromises);
        console.log('All gallery media preloaded successfully');

      } catch (error) {
        console.error('Error fetching Cloudinary media:', error);
        // Fallback to empty array if fetch fails
        setMedia([]);
      }
    };

    fetchAndPreloadMedia();
  }, []);

  const styles = {
    fontFamily: 'Freigeist, sans-serif',
    fontWeight: "300",
  };

  const stylesButtons = {
    fontSize: "clamp(1.2rem, 5vw, 8rem)"
  }

  return (
    <>
      <main
        style={{
          minHeight: '100dvh',
          WebkitMinHeight: '-webkit-fill-available',
        } as React.CSSProperties}
      >
        <div className="flex flex-col justify-between items-start w-screen h-screen fixed top-0 left-0 sm:px-8 sm:py-5 px-4 py-3 bg-[#FC79C8]">
          <h2
            className="text-black leading-[1.12] text-[1.5rem] sm:text-[clamp(2rem,3vw,8rem)]"
            style={styles}
          >
            Matthew Parisien is a software developer and visual artist based in Montreal, working at the intersection of engineering and design. He builds digital systems and tools where creative thinking informs not just aesthetics, but structure, usability, and execution.

            With a background that spans data-driven development and years leading a
            {/* <button className='underline decoration-1 sm:decoration-2 underline-offset-3 cursor-pointer' onClick={() => setIsGridActive(true)}>creative studio</button> */}
            creative studio,
            Matthew approaches engineering as a creative practice—translating abstract ideas into clear, scalable systems and collaborating seamlessly across technical and creative teams. He is currently working at Innocap, where he builds data-driven platforms and AI-powered tools. Scroll to see creative work.
          </h2>
          <div className='flex items-center justify-between w-full [&>a]:cursor-pointer [&>a]:decoration-[2px] [&>a]:decoration-black [&>a]:underline-offset-2 [&>a]:hover:underline' style={{ ...styles, fontWeight: 400 }} >
            <div className='text-sm sm:text-lg md:text-xl font-sans'>Matthew Parisien *</div>
            <a className='text-sm sm:text-lg text-lg md:text-xl font-sans' href='mailto:matthewparisien4@gmail.com'>matthewparisien4@gmail.com</a>
          </div>
        </div>
        {/* <Intro items={media} /> */}
        {media.length && <StickySections items={media} isActive={isGridActive} />}
      </main >


    </>
  );
}
