import { NextResponse } from "next/server";
import sizeOf from "image-size";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import type { MediaItem, MediaMeta } from "@/types/media";

/* -----------------------------
   Cloudflare R2 (S3-compatible)
-------------------------------- */

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

/* -----------------------------
   Types
-------------------------------- */
// MediaItem and MediaMeta are imported from @/types/media

/** Shape of a single image record returned by the Cloudflare Images v1 API. */
type CloudflareImage = {
  variants: string[];
  meta?: MediaMeta & { width?: number; height?: number };
};

/* -----------------------------
   Route
-------------------------------- */
export async function GET() {
  try {
    /* -----------------------------
       Fetch Cloudflare Images
    -------------------------------- */
    const imagesRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID}/images/v1`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGES_API_TOKEN}`,
        },
        cache: "no-store",
      }
    );

    if (!imagesRes.ok) {
      throw new Error("Failed to fetch Cloudflare Images");
    }

    const imagesJson = await imagesRes.json();
    const images = imagesJson?.result?.images ?? [];

    const imagesWithMetadata: MediaItem[] = await Promise.all(
      images.map(async (image: CloudflareImage) => {
        const url = image?.variants?.[0];
        if (!url) return null;

        // Prefer metadata if available
        if (image.meta?.width && image.meta?.height) {
          return {
            url,
            type: "image",
            width: image.meta.width,
            height: image.meta.height,
            aspectRatio: image.meta.width / image.meta.height,
            meta: image.meta,
          };
        }

        // Fallback: fetch image to get dimensions
        try {
          const res = await fetch(url);
          const buffer = Buffer.from(await res.arrayBuffer());
          const dimensions = sizeOf(buffer);

          return {
            url,
            type: "image",
            width: dimensions.width ?? null,
            height: dimensions.height ?? null,
            aspectRatio:
              dimensions.width && dimensions.height
                ? dimensions.width / dimensions.height
                : null,
            meta: image.meta,
          };
        } catch {
          return {
            url,
            type: "image",
            width: null,
            height: null,
            aspectRatio: null,
            meta: image.meta,
          };
        }
      })
    );

    /* -----------------------------
       Fetch R2 Videos
    -------------------------------- */
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    });

    const listResult = await r2.send(listCommand);

    const videosWithMetadata: MediaItem[] = (listResult.Contents ?? [])
      .filter(obj => obj.Key?.match(/\.(mp4|webm|mov)$/i))
      .map(obj => ({
        url: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${obj.Key}`,
        type: "video",
        width: 1920, // placeholder — store real values at upload time
        height: 1080,
        aspectRatio: 16 / 9,
      }));

    /* -----------------------------
       Combine & Respond
    -------------------------------- */
    const media = [
      ...imagesWithMetadata.filter(Boolean).filter(x => x.meta?.excludeFromShowcase !== "true"),
      ...videosWithMetadata,
    ];

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Media API error:", error);
    return NextResponse.json(
      { media: [], error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}
