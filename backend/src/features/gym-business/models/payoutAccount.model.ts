import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const payoutAccountSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      default: "RAZORPAYX",
    },
    providerAccountId: {
      type: String,
      default: null,
    },
    panNumber: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    maskedAccountNumber: {
      type: String,
      required: true,
    },
    rawAccountNumber: {
      type: String,
      select: false, // Never exposed in standard API queries
      default: null,
    },
    ifsc: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    bankName: {
      type: String,
      default: null,
      trim: true,
    },
    branchName: {
      type: String,
      default: null,
      trim: true,
    },
    accountType: {
      type: String,
      enum: ["SAVINGS", "CURRENT"],
      default: "CURRENT",
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    verificationMessage: {
      type: String,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export type PayoutAccount = InferSchemaType<typeof payoutAccountSchema>;
const PayoutAccount = registerModel("PayoutAccount", payoutAccountSchema);

export default PayoutAccount;
