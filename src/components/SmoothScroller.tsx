'use client';

import { SmoothScrollProvider } from "@/app/contexts/SmoothScroll.context";

const SmoothScroller: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SmoothScrollProvider>
      {children}
    </SmoothScrollProvider>
  );
}

export default SmoothScroller;