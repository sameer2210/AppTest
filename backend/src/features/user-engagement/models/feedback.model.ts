import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const feedbackSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    isLiked: { type: Boolean, default: false },
    rating: { type: Number, default: 5 },
    feedback: { type: String, default: "" },
  },
  { timestamps: true },
);

export type Feedback = InferSchemaType<typeof feedbackSchema>;
const FeedbackModel = registerModel("Feedback", feedbackSchema);
export default FeedbackModel;
