/**
 * Stroke model — represents one complete drawn stroke on the collective board.
 *
 * A stroke is collected while the user draws (mousedown → mousemove → mouseup)
 * and flushed to the DB when the pointer is released.
 */

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStroke extends Document {
  boardId: string;
  tool: "pencil" | "eraser";
  color: string;
  brushSize: number;
  /** Ordered array of {x, y} points in CSS-pixel space */
  points: Array<{ x: number; y: number }>;
  createdAt: Date;
}

const PointSchema = new Schema<{ x: number; y: number }>(
  { x: { type: Number, required: true }, y: { type: Number, required: true } },
  { _id: false }
);

const StrokeSchema = new Schema<IStroke>(
  {
    boardId: { type: String, required: true, index: true, default: "main" },
    tool: { type: String, enum: ["pencil", "eraser"], required: true },
    color: { type: String, required: true },
    brushSize: { type: Number, required: true },
    points: { type: [PointSchema], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Avoid model re-compilation during Next.js HMR
const Stroke: Model<IStroke> =
  mongoose.models.Stroke ?? mongoose.model<IStroke>("Stroke", StrokeSchema);

export default Stroke;
