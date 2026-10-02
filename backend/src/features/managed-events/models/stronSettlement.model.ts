// StronSettlement: the payout record for a completed event. Totals are computed from
// captured (non-refunded) transactions; release is a manual finance step in V1.

import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const bankSnapshotSchema = new Schema(
  {
    pan: { type: String, default: null },
    bankAccountHolderName: { type: String, default: null },
    bankAccountNumber: { type: String, default: null },
    ifsc: { type: String, default: null },
  },
  { _id: false },
);

const settlementSchema = new Schema(
  {
    eventKey: { type: String, required: true, unique: true, index: true },
    organizerUid: { type: String, required: true, index: true },

    participantCount: { type: Number, default: 0 },
    grossTicketSales: { type: Number, default: 0 },
    totalGatewayFees: { type: Number, default: 0 },
    totalPlatformCommission: { type: Number, default: 0 },
    totalRefunds: { type: Number, default: 0 },
    netPayable: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pending_kyc", "ready", "released", "on_hold"],
      default: "pending_kyc",
      index: true,
    },
    bankSnapshot: { type: bankSnapshotSchema, default: () => ({}) },
    expectedReleaseBy: { type: Date, default: null },
    releasedAt: { type: Date, default: null },
    releaseReference: { type: String, default: null },
  },
  { timestamps: true },
);

export type StronSettlement = InferSchemaType<typeof settlementSchema>;
export default registerModel("StronSettlement", settlementSchema);
