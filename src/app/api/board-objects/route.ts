import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import FabricObject from "@/models/FabricObject";

export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId") ?? "main";
  const docs = await FabricObject.find({ boardId })
    .sort({ createdAt: 1 })
    .limit(2000)
    .lean();
  return NextResponse.json({
    objects: docs.map((d) => ({ fabricJSON: d.fabricJSON })),
  });
}

export async function POST(request: Request) {
  await dbConnect();
  let body: { boardId?: string; objectId?: string; fabricJSON?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { boardId = "main", objectId, fabricJSON } = body;
  if (!objectId) return NextResponse.json({ error: "objectId required" }, { status: 400 });
  await FabricObject.findOneAndUpdate(
    { boardId, objectId },
    { $set: { boardId, objectId, fabricJSON } },
    { upsert: true, new: true }
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId") ?? "main";
  const objectId = searchParams.get("objectId");
  if (objectId) {
    // Delete a single object
    await FabricObject.deleteOne({ boardId, objectId });
  } else {
    // Clear the entire board
    await FabricObject.deleteMany({ boardId });
  }
  return NextResponse.json({ ok: true });
}
