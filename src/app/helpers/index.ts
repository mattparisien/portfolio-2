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

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    throw new Error("Chunk size must be greater than 0.");
  }

  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Simple seeded PRNG for deterministic shuffling
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export { mulberry32 };

export function shuffleArray<T>(array: T[], seed: number): T[] {
  const random = mulberry32(seed);
  const arr = array.slice(); // copy to avoid mutating original
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}