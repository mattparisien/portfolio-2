/**
 * /api/strokes
 *
 * GET  — load all strokes for a board (oldest first, capped at 5 000 to keep
 *         replay fast; production would paginate or use change-streams).
 * POST — save a newly completed stroke.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Stroke from "@/models/Stroke";

// ─── GET ────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("boardId") ?? "main";

    const strokes = await Stroke.find({ boardId })
      .sort({ createdAt: 1 })
      .limit(5000)
      .lean();

    return NextResponse.json({ strokes }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/strokes]", err);
    return NextResponse.json({ error: "Failed to load strokes" }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { boardId = "main", tool, color, brushSize, points } = body;

    if (!tool || !color || !brushSize || !Array.isArray(points) || points.length === 0) {
      return NextResponse.json({ error: "Invalid stroke data" }, { status: 400 });
    }

    const stroke = await Stroke.create({ boardId, tool, color, brushSize, points });

    return NextResponse.json({ stroke }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/strokes]", err);
    return NextResponse.json({ error: "Failed to save stroke" }, { status: 500 });
  }
}
