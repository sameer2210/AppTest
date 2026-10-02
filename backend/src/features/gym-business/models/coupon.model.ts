import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const couponSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    normalizedCode: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["PERCENTAGE", "FIXED_AMOUNT"],
      required: true,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: null,
    },
    minimumOrderValue: {
      type: Number,
      min: 0,
      default: 0,
    },
    maximumDiscount: {
      type: Number,
      min: 0,
      default: null,
    },
    totalCoupons: {
      type: Number,
      min: 1,
      default: null, // null means unlimited
    },
    usedCoupons: {
      type: Number,
      min: 0,
      default: 0,
    },
    startsAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    applicablePlanIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "MembershipPlan" }],
      default: [], // empty means applicable to all plans
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "EXPIRED"],
      default: "ACTIVE",
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

// Pre-save to ensure normalizedCode matches code
couponSchema.pre("validate", function (next) {
  if (this.code) {
    this.code = this.code.trim().toUpperCase();
    this.normalizedCode = this.code.toLowerCase();
  }
  next();
});

// Compound unique index per business + normalizedCode
couponSchema.index(
  { businessId: 1, normalizedCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
couponSchema.index({ businessId: 1, status: 1 });
couponSchema.index({ businessId: 1, expiresAt: 1 });

export type Coupon = InferSchemaType<typeof couponSchema>;
const Coupon = registerModel("Coupon", couponSchema);

export default Coupon;
