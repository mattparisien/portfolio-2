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
  const { boardId = "main", fabricJSON } = await request.json();
  await FabricObject.create({ boardId, fabricJSON });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId") ?? "main";
  await FabricObject.deleteMany({ boardId });
  return NextResponse.json({ ok: true });
}
