import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const phoneOtpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "verified", "expired", "invalidated"],
      default: "pending",
      index: true,
    },
    resendCount: { type: Number, default: 0 },
    verifyAttempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
    providerRequestId: { type: String, default: null },
  },
  { timestamps: true },
);

phoneOtpSchema.index({ phone: 1, status: 1 });
phoneOtpSchema.index({ phone: 1, createdAt: -1 });
phoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PhoneOtp = InferSchemaType<typeof phoneOtpSchema>;
const PhoneOtp = registerModel("PhoneOtp", phoneOtpSchema);

export default PhoneOtp;
