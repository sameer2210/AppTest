import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const membershipSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "EXPIRED", "CANCELLED", "PAUSED"],
      default: "PENDING",
    },
    startDate: {
      type: Date,
      required: function (this: { status?: string }): boolean {
        return this.status !== "PENDING" && this.status !== "CANCELLED";
      },
      default: null,
    },
    endDate: {
      type: Date,
      required: function (this: { status?: string }): boolean {
        return this.status !== "PENDING" && this.status !== "CANCELLED";
      },
      default: null,
    },
    purchasedAt: {
      type: Date,
      default: null,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    gatewaySubscriptionId: {
      type: String,
      default: null,
      trim: true,
    },
    gatewayCustomerId: {
      type: String,
      default: null,
      trim: true,
    },
    priceAtPurchase: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    couponUsageApplied: {
      type: Boolean,
      default: false,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
    renewalStatus: {
      type: String,
      enum: ["NONE", "SCHEDULED", "FAILED", "RENEWED"],
      default: "NONE",
    },
    notes: {
      type: String,
      default: null,
    },
    /** Firebase / JWT uid of the customer who purchased online (buyer scope). */
    customerUid: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Compound indexes for multitenant isolation and efficient status/validity queries
membershipSchema.index({ businessId: 1, memberId: 1, status: 1, endDate: -1 });
membershipSchema.index({ businessId: 1, status: 1, endDate: 1 });
membershipSchema.index({ businessId: 1, planId: 1 });
membershipSchema.index({ businessId: 1, gatewaySubscriptionId: 1 }, { sparse: true });
membershipSchema.index({ businessId: 1, gatewayCustomerId: 1 }, { sparse: true });
membershipSchema.index({ customerUid: 1, createdAt: -1 }, { sparse: true });

export type Membership = InferSchemaType<typeof membershipSchema>;
const Membership = registerModel("Membership", membershipSchema);

export default Membership;
