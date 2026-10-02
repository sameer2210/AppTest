// StronFaceOffMatch: one daily 1v1 pairing in a Face Off event. Odd participants are
// paired with a bot. A match ends by instant knockout (step lead) or at day end.

import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const sideSchema = new Schema(
  {
    uid: { type: String, required: true },
    isBot: { type: Boolean, default: false },
    steps: { type: Number, default: 0 },
    baselineSteps: { type: Number, default: 0 },
    // For bots: the total steps they will reach by day end.
    botTargetSteps: { type: Number, default: 0 },
  },
  { _id: false },
);

const faceOffMatchSchema = new Schema(
  {
    eventKey: { type: String, required: true, index: true },
    dayKey: { type: String, required: true, index: true },
    weekKey: { type: String, required: true },
    playerA: { type: sideSchema, required: true },
    playerB: { type: sideSchema, required: true },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      index: true,
    },
    winnerUid: { type: String, default: null },
    decidedBy: { type: String, enum: ["ko", "day_end", "tie", null], default: null },
    koAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Fast lookup of a participant's active match for a given day (step-sync hook).
faceOffMatchSchema.index({ eventKey: 1, dayKey: 1, "playerA.uid": 1 });
faceOffMatchSchema.index({ eventKey: 1, dayKey: 1, "playerB.uid": 1 });

export type StronFaceOffMatch = InferSchemaType<typeof faceOffMatchSchema>;
export default registerModel("StronFaceOffMatch", faceOffMatchSchema);
