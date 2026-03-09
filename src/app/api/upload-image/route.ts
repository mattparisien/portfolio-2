import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are supported." },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    const cfFormData = new FormData();
    cfFormData.append("file", file);

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_IMAGES_API_TOKEN}`,
        },
        body: cfFormData,
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Cloudflare Images upload error:", errorText);
      return NextResponse.json(
        { error: "Failed to upload image to Cloudflare" },
        { status: res.status }
      );
    }

    const json = await res.json();
    const url = json.result?.variants?.[0] ?? null;

    if (!url) {
      console.error("Cloudflare Images upload succeeded but returned no variant URL:", json);
      return NextResponse.json(
        { error: "Upload succeeded but no image URL was returned" },
        { status: 502 }
      );
    }

    return NextResponse.json({ url, image: json.result });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
