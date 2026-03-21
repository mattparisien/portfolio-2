import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/ogg"];
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only MP4, WebM, MOV, and OGG video are supported." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 100 MB." },
        { status: 400 }
      );
    }

    const ext =
      file.type === "video/mp4"       ? "mp4"  :
      file.type === "video/webm"      ? "webm" :
      file.type === "video/quicktime" ? "mov"  :
      "ogv";

    const key = `board-videos/${randomUUID()}.${ext}`;
    const buffer = await file.arrayBuffer();

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: file.type,
        CacheControl: "public, max-age=31536000",
      })
    );

    const url = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
