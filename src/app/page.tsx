"use client"
import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import ZigzagButton from '../components/ZigzagButton';
import MediaGrid from '@/components/MediaGrid/MediaGrid';

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
        className="flex items-start justify-start sm:px-8 sm:py-5 px-4 py-3 bg-[#FC79C8]"
        style={{
          minHeight: '100dvh',
          height: '100dvh',
          WebkitMinHeight: '-webkit-fill-available',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)',
        } as React.CSSProperties}
      >
        {media.length && <MediaGrid items={media}/>}
        <div className="flex flex-col justify-between items-start h-full w-full">
          <h2
            className="text-black leading-[1.12] text-[1.5rem] xs:text-[1.8rem] sm:text-[2rem] md:text-[2.3rem] lg:text-[2.6rem] xl:text-[3rem]"
            style={styles}
          >
            Matthew Parisien is a software developer and visual artist based in Montreal, working at the intersection of engineering and design. He builds digital systems and tools where creative thinking informs not just aesthetics, but structure, usability, and execution.

            With a background that spans data-driven development and years leading a creative studio, Matthew approaches engineering as a creative practice—translating abstract ideas into clear, scalable systems and collaborating seamlessly across technical and creative teams. He is currently working at Innocap, where he builds data-driven platforms and AI-powered tools.
          </h2>
          <div className='flex items-center justify-between w-full mb-5 [&>a]:cursor-pointer [&>a]:decoration-[2px] [&>a]:decoration-black [&>a]:underline-offset-2 [&>a]:hover:underline' style={{ ...styles, fontWeight: 400 }} >
            <div className='text-sm sm:text-lg md:text-xl'>Matthew Parisien *</div>
            <a className='text-sm sm:text-lg text-lg md:text-xl' href='mailto:matthewparisien4@gmail.com'>matthewparisien4@gmail.com</a>
          </div>
        </div>
      </main>

      {/* Modal Slideshow */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-white flex items-center justify-center z-50"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Close button positioned at top right of screen */}
          <button
            onClick={() => setIsModalOpen(false)}
            className="fixed top-4 right-4 sm:right-14 sm:top-10 text-black hover:opacity-70 z-20 w-8 h-8 cursor-pointer"
          >
            <svg width="100%" height="100%" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 8L8 24M8 8L24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div
            className="relative max-h-full sm:p-14 w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Image Display */}
            <div className="embla overflow-hidden cursor-grab" ref={emblaRef}>
              <div className="embla__container flex">
                {media.map((item, index) => (
                  <div className="embla__slide flex-[0_0_auto] min-w-0 h-[65vh] flex items-center" key={index}>
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt={`Creative work ${index + 1}`}
                        className="h-full w-auto object-contain"
                      />
                    ) : (
                      <video
                        src={item.url}
                        className="h-full w-auto object-contain"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Arrows - Below the carousel */}
            <div className="flex justify-center gap-4 mt-6">
              <button
                onClick={scrollPrev}
                className="text-black text-3xl hover:opacity-70 transition-opacity cursor-pointer"
                style={{ fontFamily: 'Freigeist, sans-serif' }}
              >
                ←
              </button>
              <button
                onClick={scrollNext}
                className="text-black text-3xl hover:opacity-70 transition-opacity cursor-pointer"
                style={{ fontFamily: 'Freigeist, sans-serif' }}
              >
                →
              </button>
            </div>

          </div>
          <div className="absolute bottom-0 left-0 pl-10 pb-10 max-w-md">
            Selected Clients include: Lush Cosmetics, Rudsak, Incredible Cosmetics, and more.
          </div>
        </div>
      )}
    </>
  );
}
