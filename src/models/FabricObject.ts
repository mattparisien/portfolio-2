import mongoose, { Schema } from "mongoose";

const FabricObjectSchema = new Schema({
  boardId:   { type: String, required: true, index: true },
  objectId:  { type: String, required: true },
  /** Full serialised fabric object — result of fabricObj.toObject() */
  fabricJSON: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Unique constraint so upserts work correctly
FabricObjectSchema.index({ boardId: 1, objectId: 1 }, { unique: true });

export default mongoose.models.FabricBoardObject ??
  mongoose.model("FabricBoardObject", FabricObjectSchema);
