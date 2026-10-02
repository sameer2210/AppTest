// Records Connect QR scans (user↔user) and event ticket check-ins.

import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const connectScanSchema = new Schema(
  {
    // Who scanned the QR.
    scannerUid: { type: String, required: true, index: true },
    // Target user from a connect QR (stron://user/<uid>).
    targetUid: { type: String, default: null, index: true },
    // Event check-in fields when scanning a ticket QR (STRON|ticket|event|uid).
    eventKey: { type: String, default: null, index: true },
    ticketNumber: { type: String, default: null },
    participantUid: { type: String, default: null, index: true },
    kind: {
      type: String,
      enum: ["user_connect", "event_check_in", "station_check_in", "gym_check_in"],
      required: true,
      index: true,
    },
    rawPayload: { type: String, default: null },
  },
  { timestamps: true },
);

connectScanSchema.index({ scannerUid: 1, createdAt: -1 });
connectScanSchema.index(
  { scannerUid: 1, targetUid: 1, kind: 1 },
  { partialFilterExpression: { kind: "user_connect" } },
);

export type StronConnectScan = InferSchemaType<typeof connectScanSchema>;
export default registerModel("StronConnectScan", connectScanSchema);
