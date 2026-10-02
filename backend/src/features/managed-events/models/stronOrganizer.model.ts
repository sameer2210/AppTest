// Organizer profile for STRON Managed Events.
// One profile per user (uid). Onboarding fields gate event creation; KYC gates settlement.

import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const kycSchema = new Schema(
  {
    pan: { type: String, default: null },
    bankAccountHolderName: { type: String, default: null },
    bankAccountNumber: { type: String, default: null },
    ifsc: { type: String, default: null },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
  },
  { _id: false },
);

const organizerSchema = new Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    email: { type: String, required: true },
    organizationName: { type: String, default: null },
    website: { type: String, default: null },
    instagram: { type: String, default: null },
    kyc: { type: kycSchema, default: () => ({}) },
    // Team accounts get unlimited active listings (Section 3 of the spec).
    accountType: {
      type: String,
      enum: ["individual", "team"],
      default: "individual",
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
  },
  { timestamps: true },
);

// True only when every settlement-required KYC field is present and marked verified.
organizerSchema.methods.isKycComplete = function isKycComplete() {
  const kyc = this.kyc || {};
  return Boolean(
    kyc.verified &&
      kyc.pan &&
      kyc.bankAccountHolderName &&
      kyc.bankAccountNumber &&
      kyc.ifsc,
  );
};

export type StronOrganizer = InferSchemaType<typeof organizerSchema>;
export default registerModel("StronOrganizer", organizerSchema);
