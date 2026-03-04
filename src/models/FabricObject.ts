import mongoose, { Schema } from "mongoose";

const FabricObjectSchema = new Schema({
  boardId: { type: String, required: true, index: true },
  /** Full serialised fabric object — result of fabricObj.toObject() */
  fabricJSON: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.FabricBoardObject ??
  mongoose.model("FabricBoardObject", FabricObjectSchema);
