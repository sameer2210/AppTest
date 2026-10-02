import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const paymentSchema = new Schema(
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
    membershipId: {
      type: Schema.Types.ObjectId,
      ref: "Membership",
      default: null,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "MembershipPlan",
      default: null,
    },
    planName: {
      type: String,
      default: null,
    },
    eventName: {
      type: String,
      default: null,
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    amount: {
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
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    method: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "ONLINE"],
      required: true,
    },
    source: {
      type: String,
      enum: ["MANUAL", "GATEWAY"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    transactionId: {
      type: String,
      default: null,
    },
    gatewayOrderId: {
      type: String,
      default: null,
      index: true,
    },
    gatewayPaymentId: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    recordedBy: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

paymentSchema.index({ businessId: 1, createdAt: -1 });
paymentSchema.index({ businessId: 1, memberId: 1 });
paymentSchema.index({ businessId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ businessId: 1, transactionId: 1 }, { sparse: true });
/** Idempotency key for Razorpay subscription.charged / verify retries */
paymentSchema.index(
  { gatewayPaymentId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { gatewayPaymentId: { $type: "string" } } },
);

export type Payment = InferSchemaType<typeof paymentSchema>;
const Payment = registerModel("Payment", paymentSchema);

export default Payment;
