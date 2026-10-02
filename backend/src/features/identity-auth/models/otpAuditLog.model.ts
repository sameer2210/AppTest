import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const otpAuditLogSchema = new Schema(
  {
    phoneMasked: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: [
        "send",
        "resend",
        "verify_success",
        "verify_failed",
        "send_failed",
        "invalidated",
      ],
      required: true,
      index: true,
    },
    reason: { type: String, default: null },
    ip: { type: String, default: null },
    providerRequestId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

otpAuditLogSchema.index({ phoneMasked: 1, action: 1, createdAt: -1 });

export type OtpAuditLog = InferSchemaType<typeof otpAuditLogSchema>;
const OtpAuditLog = registerModel("OtpAuditLog", otpAuditLogSchema);

export default OtpAuditLog;
