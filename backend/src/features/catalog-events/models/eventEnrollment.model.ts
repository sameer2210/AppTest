import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const eventEnrollmentSchema = new Schema(
  {
    uid: { type: String, required: true, index: true, ref: "User" },
    eventKey: { type: String, required: true, index: true },
    planId: { type: String, default: null, index: true },
    planLabel: { type: String, default: null },
    paymentAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "paid",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "eliminated", "expired", "cancelled"],
      default: "active",
      index: true,
    },
    autoEnrolled: { type: Boolean, default: false },
    couponCode: { type: String, default: null, index: true },
    couponEventType: { type: String, default: null, index: true },
    couponSubType: { type: String, default: null, index: true },
    seasonKey: { type: String, default: null, index: true },
    bibNumber: { type: String, default: null, index: true },
    enrolledAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
    eliminatedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    lastAppliedDayKey: { type: String, default: null },
    currentCycleSteps: { type: Number, default: 0 },
    leaderboardSteps: { type: Number, default: 0 },
    qualifiedDays: { type: Number, default: 0 },
    targetDays: { type: Number, default: 0 },
    targetStepsPerDay: { type: Number, default: 0 },
    distanceKm: { type: Number, default: 0 },
    enrollmentStartTodaySteps: { type: Number, default: 0 },
    survivorRewardTier: { type: Number, default: 0 },
    rewardEligible: { type: Boolean, default: false },
    rewardClaimedAt: { type: Date, default: null },
    rewardClaimBoxType: { type: String, default: null },
  },
  {
    timestamps: true,
  },
);

eventEnrollmentSchema.index({ uid: 1, eventKey: 1, seasonKey: 1 });

export type EventEnrollment = InferSchemaType<typeof eventEnrollmentSchema>;

const EventEnrollmentModel = registerModel(
  "EventEnrollment",
  eventEnrollmentSchema,
);

export default EventEnrollmentModel;
