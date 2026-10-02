// StronEvent: an organizer-created, STRON-managed event across the four game formats.
// The public identifier is `key`; participation, transactions, and matches all reference it.

import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";
import { STRON_FORMAT_VALUES } from "../services/stronFormats.service.js";

const ticketTypeSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    // Marathon fields (distance/steps and per-participant days to finish).
    distanceKm: { type: Number, default: null },
    targetSteps: { type: Number, default: null },
    days: { type: Number, default: null },
    // Step Challenge field (daily steps needed for a "successful" day).
    dailyStepTarget: { type: Number, default: null },
    soldCount: { type: Number, default: 0 },
    /** Optional inclusions / description shown on ticket cards. */
    benefits: { type: String, default: "" },
  },
  { _id: false },
);

const eventSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    organizerUid: { type: String, required: true, index: true },
    organizerName: { type: String, default: null },
    format: { type: String, enum: STRON_FORMAT_VALUES, required: true },

    title: { type: String, required: true },
    description: { type: String, default: "" },
    rules: { type: [String], default: [] },
    bannerName: { type: String, default: null },

    // Marathon
    marathonMode: { type: String, enum: ["virtual", "in_person", null], default: null },
    destination: { type: String, default: null },
    virtualLink: { type: String, default: null },
    // Step Challenge: number of successful days needed to complete (y).
    successfulDaysRequired: { type: Number, default: null },

    ticketTypes: { type: [ticketTypeSchema], default: [] },

    capacity: { type: Number, default: null },
    registrationCount: { type: Number, default: 0 },
    soldOut: { type: Boolean, default: false },

    durationDays: { type: Number, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    registrationStartDate: { type: Date, default: null },
    registrationEndDate: { type: Date, default: null },

    /** Organizer-selected reward labels shown as pills on the event page. */
    rewardLabels: { type: [String], default: [] },
    /** Participant info fields requested at registration. */
    participantInfoFields: { type: [String], default: [] },
    /** Optional registration coupons: [{ code, discountRupees }]. */
    registrationCoupons: {
      type: [
        {
          code: { type: String, required: true },
          discountRupees: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },

    listingType: {
      type: String,
      enum: ["stron_managed", "self_managed", "external"],
      default: "stron_managed",
    },
    status: {
      type: String,
      enum: ["draft", "published", "live", "completed", "cancelled", "settled"],
      default: "draft",
      index: true,
    },

    // Marathon first-to-complete ordering uses this monotonically-increasing counter.
    marathonCompletionCounter: { type: Number, default: 0 },

    publishedAt: { type: Date, default: null },
    liveAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: null },
    settledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const ACTIVE_LISTING_STATUSES = ["published", "live"];

export type StronEvent = InferSchemaType<typeof eventSchema>;
export default registerModel("StronEvent", eventSchema);
