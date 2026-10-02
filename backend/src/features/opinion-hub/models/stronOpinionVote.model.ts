import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const stronOpinionVoteSchema = new Schema(
  {
    cycleId: { type: Number, required: true, index: true },
    questionId: { type: String, required: true, index: true },
    uid: { type: String, required: true, index: true },
    optionId: { type: String, required: true },
    stepWeight: { type: Number, default: 1 },
    votedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Enforce one vote per user per question in a 12-hour cycle
stronOpinionVoteSchema.index({ cycleId: 1, questionId: 1, uid: 1 }, { unique: true });

export type StronOpinionVote = InferSchemaType<typeof stronOpinionVoteSchema>;
const StronOpinionVoteModel = registerModel("StronOpinionVote", stronOpinionVoteSchema);

export default StronOpinionVoteModel;
