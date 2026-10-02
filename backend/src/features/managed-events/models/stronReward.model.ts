// StronReward: virtual medals (top 3) and certificates (all participants)
// issued when a managed event completes.

import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";
import { STRON_FORMAT_VALUES } from "../services/stronFormats.service.js";

const statsSchema = new Schema(
  {
    kingTimeSeconds: { type: Number, default: null },
    totalWins: { type: Number, default: null },
    totalSteps: { type: Number, default: null },
    successfulDays: { type: Number, default: null },
    requiredDays: { type: Number, default: null },
    distanceKm: { type: Number, default: null },
    distanceTargetKm: { type: Number, default: null },
    finishTimeSeconds: { type: Number, default: null },
  },
  { _id: false },
);

const rewardSchema = new Schema(
  {
    uid: { type: String, required: true, index: true },
    eventKey: { type: String, required: true, index: true },
    participationId: {
      type: Schema.Types.ObjectId,
      ref: "StronParticipation",
      default: null,
    },

    type: {
      type: String,
      enum: ["medal", "certificate"],
      required: true,
      index: true,
    },
    // Medals only: gold=1, silver=2, bronze=3
    medalTier: {
      type: String,
      enum: ["gold", "silver", "bronze"],
      default: null,
    },
    rank: { type: Number, default: null },

    format: { type: String, enum: STRON_FORMAT_VALUES, required: true },
    eventTitle: { type: String, required: true },
    venue: { type: String, default: null },
    eventDate: { type: Date, default: null },

    displayName: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    stats: { type: statsSchema, default: () => ({}) },

    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// One medal and one certificate per user per event.
rewardSchema.index({ uid: 1, eventKey: 1, type: 1 }, { unique: true });
rewardSchema.index({ uid: 1, issuedAt: -1 });

export type StronReward = InferSchemaType<typeof rewardSchema>;
export default registerModel("StronReward", rewardSchema);
