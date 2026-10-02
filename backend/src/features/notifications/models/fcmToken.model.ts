import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const fcmTokenSchema = new Schema({
  _id: { type: String, required: true },

  user: { 
    type: String, 
    ref: 'User', 
    required: true 
  },
  token: { type: String, default: null } 
}, {
  _id: false, 
  timestamps: true 
});

export type FcmToken = InferSchemaType<typeof fcmTokenSchema>;
const FcmTokenModel = registerModel("FcmToken", fcmTokenSchema);

export default FcmTokenModel;
