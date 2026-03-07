/**
 * Metadata attached to each media item, sourced from Cloudflare Images tags.
 * Values are stored as strings in Cloudflare's metadata API, hence the
 * "true" | "false" literals instead of plain booleans.
 */
export type MediaMeta = {
  isFullScreen?: "true" | "false";
  removeBackground?: "true" | "false";
  rotate?: string;
  context?: string;
  transform?: "scale";
  excludeFromShowcase?: "true" | "false";
};

/**
 * A single media asset (image or video) with dimensions and optional metadata.
 * This is the canonical type shared across the API route, components, and page.
 */
export type MediaItem = {
  url: string;
  type: "image" | "video";
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  meta?: MediaMeta;
};

/**
 * Alias kept for backwards compatibility with existing component imports.
 */
export type MediaGridItem = MediaItem;
