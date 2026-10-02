import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const proSubscriptionSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      default: null,
    },
    userId: {
      type: String,
      default: null,
    },
    planCode: {
      type: String,
      default: "STRON_PRO",
    },
    status: {
      type: String,
      enum: ["PENDING", "TRIAL", "ACTIVE", "PAUSED", "PAST_DUE", "CANCELLED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    billingCycle: {
      type: String,
      enum: ["MONTHLY"],
      default: "MONTHLY",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    resumeAt: {
      type: Date,
      default: null,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    gateway: {
      type: String,
      default: "revenuecat",
    },
    gatewayCustomerId: {
      type: String,
      default: null,
    },
    gatewaySubscriptionId: {
      type: String,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },
    rcAppUserId: { type: String, default: null },
    originalAppUserId: { type: String, default: null },
    productIdentifier: { type: String, default: null },
    store: { type: String, default: null },
    periodType: { type: String, default: null },
    subscriberName: { type: String, default: null },
    subscriberEmail: { type: String, default: null },
    subscriberPhone: { type: String, default: null },
    subscriberIp: { type: String, default: null },
    idfv: { type: String, default: null },
    idfa: { type: String, default: null },
    gpsAdId: { type: String, default: null },
    deviceVendorId: { type: String, default: null },
  },
  { timestamps: true },
);

proSubscriptionSchema.index(
  { businessId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { businessId: { $type: "objectId" } },
  },
);
proSubscriptionSchema.index(
  { userId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { userId: { $type: "string" } },
  },
);
proSubscriptionSchema.index({ businessId: 1, status: 1 });
proSubscriptionSchema.index({ userId: 1, status: 1 });
proSubscriptionSchema.index({ businessId: 1, createdAt: -1 });
proSubscriptionSchema.index({ userId: 1, createdAt: -1 });

export type ProSubscription = InferSchemaType<typeof proSubscriptionSchema>;
const ProSubscription = registerModel("ProSubscription", proSubscriptionSchema);

// Safe cleanup for legacy non-sparse unique index if present in existing database
void ProSubscription.collection.dropIndex("businessId_1").catch(() => {});

export default ProSubscription;
