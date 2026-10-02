import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const couponCodeSchema = new Schema(
  {
    couponCode: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    subType: { type: String, required: true, index: true },
    price: { type: Number, default: 0 },
    used: { type: Boolean, default: false, index: true },
    userId: { type: String, default: null, index: true },
    usedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

couponCodeSchema.index({ couponCode: 1, eventType: 1, subType: 1, used: 1 });

const CouponCodeModel = mongoose.model(
  "CouponCode",
  couponCodeSchema,
  "CouponCodes",
);

export default CouponCodeModel;
