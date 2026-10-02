import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const membershipPlanSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    billingCycle: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    durationUnit: {
      type: String,
      enum: ["DAYS", "MONTHS", "YEARS"],
      default: "MONTHS",
    },
    isFreeTrial: {
      type: Boolean,
      default: false,
    },
    trialDuration: {
      type: Number,
      default: 0,
    },
    /** Paid pack this trial converts into at trial end. Optional. */
    convertToPlanId: {
      type: Schema.Types.ObjectId,
      ref: "MembershipPlan",
      default: null,
    },
    perks: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "DRAFT", "STOPPED"],
      default: "ACTIVE",
    },
    /** Razorpay Plan ID used when creating auto-renew subscriptions */
    gatewayPlanId: {
      type: String,
      default: null,
      trim: true,
    },
    activeMembersCount: {
      type: Number,
      default: 0,
    },
    totalSold: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    trainerIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "StaffMember" }],
      default: [],
    },
    listingCategory: {
      type: String,
      enum: ["plan", "workshop", "class", "training"],
      default: "plan",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["PUBLIC", "MEMBERS_ONLY", "PRIVATE"],
      default: "PUBLIC",
    },
    allowedPlanIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "MembershipPlan" }],
      default: [],
    },
    inviteSlug: {
      type: String,
      default: null,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Compound indexes
membershipPlanSchema.index({ businessId: 1, status: 1 });
membershipPlanSchema.index({ businessId: 1, isDeleted: 1, createdAt: -1 });
membershipPlanSchema.index({ inviteSlug: 1 }, { unique: true, sparse: true });

export type MembershipPlan = InferSchemaType<typeof membershipPlanSchema>;
const MembershipPlan = registerModel("MembershipPlan", membershipPlanSchema);

export default MembershipPlan;
