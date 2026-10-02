import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../types/mongoose.util.js";

const interestSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

interestSchema.index({ isActive: 1, name: 1 });

export type Interest = InferSchemaType<typeof interestSchema>;
const InterestModel = registerModel("Interest", interestSchema);

export default InterestModel;
