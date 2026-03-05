declare module "omggif" {
  interface GifFrameInfo {
    x: number;
    y: number;
    width: number;
    height: number;
    delay: number; // centiseconds
    disposal: number; // 0=unset,1=leave,2=background,3=previous
    transparent_index: number | null;
  }
  class GifReader {
    width: number;
    height: number;
    constructor(buf: Uint8Array);
    numFrames(): number;
    frameInfo(frameNum: number): GifFrameInfo;
    decodeAndBlitFrameRGBA(frameNum: number, pixels: Uint8ClampedArray): void;
  }
  export { GifReader };
}
