import { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";
import { WHATSAPP_REMINDER_TYPES } from "../../../constants/index.js";

const whatsappReminderConfigSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: WHATSAPP_REMINDER_TYPES,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    dayOffsets: {
      type: [Number],
      default: [],
    },
    audience: {
      type: String,
      enum: ["ALL", "QUEUE_TOP_N"],
      default: "ALL",
    },
    audienceLimit: {
      type: Number,
      default: null,
      min: 1,
    },
    templateOverride: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      default: "",
    },
    targetLabel: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

whatsappReminderConfigSchema.index({ businessId: 1, type: 1 }, { unique: true });

export type WhatsappReminderConfig = InferSchemaType<typeof whatsappReminderConfigSchema>;
const WhatsappReminderConfig = registerModel(
  "WhatsappReminderConfig",
  whatsappReminderConfigSchema,
);

export default WhatsappReminderConfig;
