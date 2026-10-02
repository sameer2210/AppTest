import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const dailyActivitySchema = new Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
    ref: "User",
    index: true,
  },

  lifetime: {
    totalSteps: { type: Number, default: 0 },
  },

  history: [
    {
      date: { type: Date, required: true },
      stepCount: { type: Number, default: 0 },
    },
  ],
}, {
  timestamps: true,
});

export type DailyActivity = InferSchemaType<typeof dailyActivitySchema>;
const DailyActivityModel = registerModel("DailyActivity", dailyActivitySchema);
export default DailyActivityModel;
