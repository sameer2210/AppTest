import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const stronOpinionSchema = new Schema(
  {
    questionId: { type: String, required: true, unique: true },
    cycleId: { type: Number, index: true },
    cycleStartTime: { type: Date },
    cycleEndTime: { type: Date },
    slot: { type: Number, default: 1 },
    questionNumber: { type: Number, required: true },
    questionText: { type: String, required: true },
    options: [
      {
        optionId: { type: String, required: true },
        text: { type: String, required: true },
      },
    ],
    category: { type: String, default: "sports" },
    totalVotesWeight: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    results: [
      {
        optionId: String,
        text: String,
        voteWeight: Number,
        percentage: Number,
      },
    ],
    winningOptionId: { type: String, default: null },
    settledAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    aiUpgradeAttempted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

stronOpinionSchema.index({ cycleId: 1, slot: 1 });

export type StronOpinion = InferSchemaType<typeof stronOpinionSchema>;
const StronOpinionModel = registerModel("StronOpinion", stronOpinionSchema);
export default StronOpinionModel;
