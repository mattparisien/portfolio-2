import React, { createContext, useEffect, useState } from "react";
import type { ILocomotiveScrollOptions } from "locomotive-scroll";

type LocomotiveScrollInstance = {
  destroy: () => void;
};

type SmoothScrollContextValue = {
  scroll: LocomotiveScrollInstance | null;
};

type SmoothScrollProviderProps = {
  children: React.ReactNode;
  /** Passed directly to the Locomotive Scroll constructor. */
  options?: ILocomotiveScrollOptions;
};

export const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  scroll: null,
});

export const SmoothScrollProvider = ({
  children,
  options,
}: SmoothScrollProviderProps) => {
  const [scroll, setScroll] = useState<LocomotiveScrollInstance | null>(null);

  useEffect(() => {
    if (!scroll) {
      (async () => {
        try {
          const LocomotiveScroll = (await import("locomotive-scroll")).default;

          const instance = new LocomotiveScroll(options);
          setScroll(instance as unknown as LocomotiveScrollInstance);
        } catch (error) {
          throw new Error(`[SmoothScrollProvider]: ${error}`);
        }
      })();
    }

    return () => {
      scroll?.destroy();
    };
    // `options` is intentionally omitted from the dep array. Locomotive Scroll
    // is initialised once and torn down when the component unmounts; rebuilding
    // it every time the options object reference changes would cause jank.
    // Pass a stable (memoised) options object at the call site if re-init is needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scroll]);

  return (
    <SmoothScrollContext.Provider value={{ scroll }}>
      {children}
    </SmoothScrollContext.Provider>
  );
};

SmoothScrollContext.displayName = "SmoothScrollContext";
SmoothScrollProvider.displayName = "SmoothScrollProvider";
