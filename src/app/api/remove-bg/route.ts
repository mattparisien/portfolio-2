import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/remove-bg
 *
 * Accepts a JSON body: { url: string } where `url` is a publicly accessible
 * image URL (e.g. a Cloudflare Images CDN URL).
 *
 * Forwards the image to the remove.bg API and returns the result as a base64
 * data-URL so the client can swap the Fabric image src directly.
 *
 * Requires REMOVE_BG_API_KEY in the environment.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "REMOVE_BG_API_KEY not configured" }, { status: 500 });
  }

  let url: string;
  try {
    const body = await req.json();
    url = body?.url;
    if (typeof url !== "string" || !url.startsWith("https://")) {
      return NextResponse.json({ error: "Invalid or missing image URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const form = new FormData();
  form.append("image_url", url);
  form.append("size", "auto");

  const removeBgRes = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: form,
  });

  if (!removeBgRes.ok) {
    const errText = await removeBgRes.text();
    console.error("[remove-bg] API error:", errText);
    return NextResponse.json(
      { error: "remove.bg API request failed", detail: errText },
      { status: removeBgRes.status },
    );
  }

  const buffer = await removeBgRes.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const dataUrl = `data:image/png;base64,${base64}`;

  return NextResponse.json({ dataUrl });
}
