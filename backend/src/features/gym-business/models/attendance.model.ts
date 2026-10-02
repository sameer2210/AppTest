import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const attendanceSchema = new Schema(
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
    attendanceDate: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
    },
    checkedOutAt: {
      type: Date,
      default: null,
    },
    inTime: {
      type: String, // e.g. "06:30 AM"
      default: null,
    },
    outTime: {
      type: String, // e.g. "08:15 AM"
      default: null,
    },
    source: {
      type: String,
      enum: ["MANUAL", "QR", "SYSTEM"],
      default: "MANUAL",
    },
    markedBy: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Compound unique index to prevent duplicate attendance on the same day for a member
attendanceSchema.index(
  { businessId: 1, memberId: 1, attendanceDate: 1 },
  { unique: true },
);

attendanceSchema.index({ businessId: 1, attendanceDate: 1, checkedInAt: -1 });
attendanceSchema.index({ businessId: 1, createdAt: -1 });

export type Attendance = InferSchemaType<typeof attendanceSchema>;
const Attendance = registerModel("Attendance", attendanceSchema);

export default Attendance;
