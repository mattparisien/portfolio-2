"use client"
import DraggableOverlay from '@/components/DraggableOverlay/DraggableOverlay';
import IntroSection from '@/components/IntroSection';
import StickySections, { MediaGridItem } from '@/components/StickySections/StickySections';
import StickySections2 from '@/components/StickySections/StickySections2';
import { useEffect, useState } from 'react';

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
  const [media, setMedia] = useState<MediaGridItem[]>([]);

  // Fetch and preload media from Cloudinary folder
  useEffect(() => {
    const fetchAndPreloadMedia = async () => {
      try {
        const response = await fetch('/api/cloudinary-images');
        const data = await response.json();
        const mediaItems = data.media || [];

        // Set media state first
        const shuffled = shuffle(mediaItems, 125) as MediaGridItem[];
        setMedia(shuffled);

        // Preload all media in background
        const preloadPromises = mediaItems.map((item: MediaGridItem) => {
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

  // const styles = {
  //   fontFamily: 'Adieu, sans-serif',
  //   // fontWeight: 100
    
  // };

  return (
    <>
      <main
        style={{
          minHeight: '100dvh',
          WebkitMinHeight: '-webkit-fill-available',
        } as React.CSSProperties}
        data-scroll-container
      >
       <IntroSection/>
        {/* <Intro items={media} /> */}
        {/* <DraggableOverlay items={[{
          url: "https://imagedelivery.net/Ti1_uXa4Q9gNync1g-YdPA/fcb1630d-777f-4499-7716-05e2ca754000/public",
          type: "image",
          width: 805,
          height: 701,
          aspectRatio: 805 / 701
        }, {
          url: "https://imagedelivery.net/Ti1_uXa4Q9gNync1g-YdPA/c26bba74-7388-40b5-b445-a786b3f21f00/public",
          type: "image",
          width: 683,
          height: 701,
          aspectRatio: 683 / 701
        }]} /> */}
        {media.length > 0 && <StickySections items={media.filter(x => x.type === "image")} isActive={false} />}
      </main >


    </>
  );
}


const Button = ({ children, href }: { children: React.ReactNode, href: string }) => {
  return <a href={href} target="_blank" rel="noopener noreferrer" className='underline decoration-1 sm:decoration-2 underline-offset-3 cursor-pointer'>
    {children}
  </a>
}