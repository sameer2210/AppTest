// Universal Check-In & Attendance Model
// Supports Gyms, Events, Offices, Sports Clubs, Facilities, Expos, etc.

import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const universalCheckinSchema = new Schema(
  {
    uid: { type: String, required: true, index: true },
    entityType: {
      type: String,
      enum: ["gym", "event", "office", "club", "facility", "expo", "general"],
      default: "general",
      index: true,
    },
    entityId: { type: String, required: true, index: true },
    entityName: { type: String, default: "STRON Check-In Station" },
    checkedInDate: { type: String, required: true, index: true }, // YYYY-MM-DD
    checkedInAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

universalCheckinSchema.index(
  { uid: 1, entityType: 1, entityId: 1, checkedInDate: 1 },
  { unique: true }
);

export type UniversalCheckin = InferSchemaType<typeof universalCheckinSchema>;
export default registerModel("UniversalCheckin", universalCheckinSchema);
