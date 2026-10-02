import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const refreshTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    uid: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RefreshToken = InferSchemaType<typeof refreshTokenSchema>;
const RefreshToken = registerModel("RefreshToken", refreshTokenSchema);

export default RefreshToken;
