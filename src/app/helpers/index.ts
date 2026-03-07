type Size = {
  width: number;
  height: number;
};

type FittedSize = Size & {
  scale: number;
};

/**
 * Scales an image to fit within a frame while maintaining aspect ratio.
 * The entire image will be visible (no cropping).
 */
export function fitImageToFrame(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number
): FittedSize {
  if (
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    frameWidth <= 0 ||
    frameHeight <= 0
  ) {
    throw new Error("All dimensions must be greater than 0.");
  }

  const widthScale = frameWidth / imageWidth;
  const heightScale = frameHeight / imageHeight;

  // Use the smaller scale to ensure the image fits entirely inside the frame
  const scale = Math.min(widthScale, heightScale);

  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
    scale,
  };
}

/**
 * Seeded pseudo-random number generator (mulberry32 algorithm).
 * Returns a deterministic sequence of numbers in [0, 1) for the given seed.
 */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher–Yates shuffle using a deterministic seed so the order is consistent
 * across renders and server/client hydration.
 */
export function shuffle<T>(array: T[], seed: number): T[] {
  const random = mulberry32(seed);
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Cloudflare Images stores boolean-like metadata values as the string literals
 * "true" or "false". This helper normalises them to a real boolean so
 * comparison logic stays consistent throughout the codebase.
 */
export function isMetaTrue(val?: "true" | "false" | string): boolean {
  return val === "true";
}