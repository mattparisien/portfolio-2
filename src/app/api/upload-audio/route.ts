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

const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/x-m4a",
  "audio/flac",
];

const EXT_MAP: Record<string, string> = {
  "audio/mpeg":  "mp3",
  "audio/mp4":   "m4a",
  "audio/wav":   "wav",
  "audio/ogg":   "ogg",
  "audio/aac":   "aac",
  "audio/x-m4a": "m4a",
  "audio/flac":  "flac",
};

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only MP3, M4A, WAV, OGG, AAC, and FLAC are supported." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50 MB." },
        { status: 400 }
      );
    }

    const ext = EXT_MAP[file.type] ?? "mp3";
    const key = `board-audio/${randomUUID()}.${ext}`;
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
    const trackName = file.name.replace(/\.(mp3|m4a|wav|ogg|aac|flac)$/i, "");
    return NextResponse.json({ url, trackName });
  } catch (err) {
    console.error("[upload-audio]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
