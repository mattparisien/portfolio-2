import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = (await req.json()) as { imageUrl?: string };
    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // Fetch the source image on the server (no CORS restrictions server-side)
    const sourceRes = await fetch(imageUrl);
    if (!sourceRes.ok) {
      return NextResponse.json({ error: "Failed to fetch source image" }, { status: 400 });
    }
    const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer());
    const contentType  = sourceRes.headers.get("content-type") ?? "image/png";

    // POST to remove.bg
    const removeBgForm = new FormData();
    removeBgForm.append("image_file", new Blob([sourceBuffer], { type: contentType }), "image.png");
    removeBgForm.append("size", "auto");

    const removeBgRes = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": process.env.REMOVE_BG_API_KEY! },
      body: removeBgForm,
    });

    if (!removeBgRes.ok) {
      const errText = await removeBgRes.text();
      console.error("[remove-bg] API error:", errText);
      return NextResponse.json({ error: "Background removal failed" }, { status: 502 });
    }

    const resultBuffer = Buffer.from(await removeBgRes.arrayBuffer());

    // Upload the result PNG to R2
    const key = `board-images/${randomUUID()}.png`;
    await s3.send(
      new PutObjectCommand({
        Bucket:      process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key:         key,
        Body:        resultBuffer,
        ContentType: "image/png",
      })
    );

    return NextResponse.json({ url: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}` });
  } catch (err) {
    console.error("[remove-bg]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
