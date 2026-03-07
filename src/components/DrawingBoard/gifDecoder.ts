import { GifReader } from "omggif";

export interface DecodedGif {
  /** A horizontal spritesheet with every frame side-by-side */
  spritesheet: HTMLCanvasElement;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  /** Per-frame delay in milliseconds */
  delays: number[];
}

/**
 * Decodes an animated GIF from an ArrayBuffer into a horizontal spritesheet
 * canvas + per-frame delay timings.  The caller can then animate a FabricImage
 * by advancing `cropX` by `frameWidth` each frame according to `delays`.
 */
export function decodeGif(buffer: ArrayBuffer): DecodedGif {
  const bytes = new Uint8Array(buffer);
  const reader = new GifReader(bytes);

  const totalFrames = reader.numFrames();
  const frameWidth  = reader.width;
  const frameHeight = reader.height;
  const delays: number[] = [];

  // Composite canvas accumulates frames respecting disposal methods
  const composite = document.createElement("canvas");
  composite.width  = frameWidth;
  composite.height = frameHeight;
  const cCtx = composite.getContext("2d")!;

  // Spritesheet: all frames laid horizontally
  const sheet = document.createElement("canvas");
  sheet.width  = frameWidth * totalFrames;
  sheet.height = frameHeight;
  const sCtx = sheet.getContext("2d")!;

  // Reusable full-frame RGBA pixel buffer
  const pixels = new Uint8ClampedArray(frameWidth * frameHeight * 4);
  let savedComposite: ImageData | null = null;

  for (let i = 0; i < totalFrames; i++) {
    const info  = reader.frameInfo(i);
    delays.push(Math.max((info.delay ?? 5) * 10, 20)); // centisecs → ms, min 20ms

    // Apply previous frame's disposal before drawing this frame
    if (i > 0) {
      const prev = reader.frameInfo(i - 1);
      if (prev.disposal === 2) {
        // Restore to background: clear that frame's sub-rect
        cCtx.clearRect(prev.x, prev.y, prev.width, prev.height);
      } else if (prev.disposal === 3 && savedComposite) {
        // Restore to pre-previous state
        cCtx.putImageData(savedComposite, 0, 0);
      }
    }

    // Save composite state before drawing if this frame uses disposal 3
    if (info.disposal === 3) {
      savedComposite = cCtx.getImageData(0, 0, frameWidth, frameHeight);
    }

    // Decode into pixel buffer (fills sub-rect; rest of buffer unchanged)
    // Clear the sub-rect in our buffer first so transparent pixels aren't dirty
    for (let row = info.y; row < info.y + info.height; row++) {
      const start = (row * frameWidth + info.x) * 4;
      pixels.fill(0, start, start + info.width * 4);
    }
    reader.decodeAndBlitFrameRGBA(i, pixels);

    // Draw decoded frame onto composite via a temp canvas
    // (putImageData ignores alpha compositing; we need drawImage)
    const tmp = document.createElement("canvas");
    tmp.width  = frameWidth;
    tmp.height = frameHeight;
    tmp.getContext("2d")!.putImageData(
      new ImageData(new Uint8ClampedArray(pixels), frameWidth, frameHeight),
      0, 0,
    );
    cCtx.drawImage(tmp, 0, 0);

    // Stamp this composite frame onto the spritesheet
    sCtx.drawImage(composite, i * frameWidth, 0);
  }

  return { spritesheet: sheet, frameWidth, frameHeight, totalFrames, delays };
}
