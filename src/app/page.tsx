"use client"
import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import ZigzagButton from '../components/ZigzagButton';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  format: string;
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
        setMedia(mediaItems);

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
    fontSize: 'clamp(2rem, 5vw, 8rem)',
    lineHeight: "1.12"
  };

  return (
    <>
      <main className="h-screen flex items-start justify-start px-8 py-5">
        <div className="flex flex-col justify-between items-start h-full">
          <h2
            className="text-black leading-none"
            style={styles}
          >
            Software Developer with a background that bridges engineering and design — currently at <ZigzagButton el="a" href="https://www.innocap.com/en/" target="_blank" onClick={() => console.log('Innocap clicked')}>Innocap</ZigzagButton>, where I build data intensive systems that process large volumes of hedge fund trading activity.
          </h2>
          <div>
            <h3 style={styles} className="sm:flex-row flex-col flex gap-6">
              <span>
                <ZigzagButton el="a" href="https://github.com/mattparisien" target="_blank" onClick={() => console.log('Software clicked')}>Software</ZigzagButton>
                ,
              </span>
              <span>
                <ZigzagButton onClick={() => setIsModalOpen(true)}>
                  Creative Work
                </ZigzagButton>
                ,
              </span>
              <ZigzagButton el="a" href="mailto:matthewparisien4@gmail.com" onClick={() => console.log('Contact clicked')}>
                Contact
              </ZigzagButton>
            </h3>
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
            className="fixed top-2 right-14 text-black hover:opacity-70 z-20 w-8 h-8 cursor-pointer"
          >
            <svg width="50" height="50" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                  <div className="embla__slide flex-[0_0_auto] min-w-0 h-[50vh] flex items-center" key={index}>
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
