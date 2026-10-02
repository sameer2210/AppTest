import { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";
import { WHATSAPP_ACCOUNT_ENVIRONMENTS } from "../../../constants/whatsapp.constants.js";

const whatsappAccountSchema = new Schema(
  {
    environment: {
      type: String,
      enum: WHATSAPP_ACCOUNT_ENVIRONMENTS,
      required: true,
      unique: true,
    },
    phoneNumberId: {
      type: String,
      required: true,
      trim: true,
    },
    wabaId: {
      type: String,
      default: "",
      trim: true,
    },
    displayPhoneNumber: {
      type: String,
      default: "",
      trim: true,
    },
    apiVersion: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: "whatsappAccounts" },
);

whatsappAccountSchema.index({ isActive: 1, environment: 1 });

export type WhatsappAccount = InferSchemaType<typeof whatsappAccountSchema>;
const WhatsappAccount = registerModel("WhatsappAccount", whatsappAccountSchema);

export default WhatsappAccount;
