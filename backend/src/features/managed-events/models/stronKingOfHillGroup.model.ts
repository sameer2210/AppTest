// StronKingOfHillGroup: a daily group (2-5 members, bots fill gaps) for a King of the Hill
// event. "King Time" is the cumulative seconds a member spends at the top of the group's
// step leaderboard, credited in real time and reconciled periodically.

import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const memberSchema = new Schema(
  {
    uid: { type: String, required: true },
    isBot: { type: Boolean, default: false },
    steps: { type: Number, default: 0 },
    baselineSteps: { type: Number, default: 0 },
    botTargetSteps: { type: Number, default: 0 },
    // Seconds spent as king within this day's group.
    kingSeconds: { type: Number, default: 0 },
  },
  { _id: false },
);

const groupSchema = new Schema(
  {
    eventKey: { type: String, required: true, index: true },
    dayKey: { type: String, required: true, index: true },
    members: { type: [memberSchema], default: [] },
    currentLeaderUid: { type: String, default: null },
    leaderSince: { type: Date, default: null },
    // Timestamp through which king time has already been credited.
    lastCheckpoint: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      index: true,
    },
    winnerUid: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Fast lookup of a member's active group for a day (step-sync hook).
groupSchema.index({ eventKey: 1, dayKey: 1, "members.uid": 1 });

export type StronKingOfHillGroup = InferSchemaType<typeof groupSchema>;
export default registerModel("StronKingOfHillGroup", groupSchema);
