import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const stronOpinionLikeSchema = new Schema(
  {
    cycleId: { type: Number, required: true, index: true },
    questionId: { type: String, required: true, index: true },
    uid: { type: String, required: true, index: true },
    likedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Enforce one like per user per question
stronOpinionLikeSchema.index({ questionId: 1, uid: 1 }, { unique: true });

export type StronOpinionLike = InferSchemaType<typeof stronOpinionLikeSchema>;
const StronOpinionLikeModel = registerModel("StronOpinionLike", stronOpinionLikeSchema);
export default StronOpinionLikeModel;
