import mongoose, { Schema } from "mongoose";

const FabricObjectSchema = new Schema({
  boardId:   { type: String, required: true, index: true },
  objectId:  { type: String, required: true },
  /** Full serialised fabric object — result of fabricObj.toObject() */
  fabricJSON: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Sparse so documents without objectId (legacy) don't conflict
FabricObjectSchema.index({ boardId: 1, objectId: 1 }, { unique: true, sparse: true });

// Always bust the cache in development so schema changes (like adding objectId)
// are picked up immediately without restarting the server.
if (process.env.NODE_ENV === "development" && mongoose.models.FabricBoardObject) {
  delete (mongoose.models as Record<string, unknown>).FabricBoardObject;
}

export default mongoose.models.FabricBoardObject ??
  mongoose.model("FabricBoardObject", FabricObjectSchema);
