import { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";
import {
  WHATSAPP_TEMPLATE_CATEGORIES,
  WHATSAPP_TEMPLATE_KINDS,
  WHATSAPP_TEMPLATE_STATUSES,
} from "../../../constants/whatsapp.constants.js";

const whatsappTemplateSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
      trim: true,
      default: "en",
    },
    category: {
      type: String,
      enum: WHATSAPP_TEMPLATE_CATEGORIES,
      required: true,
    },
    kind: {
      type: String,
      enum: WHATSAPP_TEMPLATE_KINDS,
      required: true,
      index: true,
    },
    dayOffset: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: WHATSAPP_TEMPLATE_STATUSES,
      default: "DRAFT",
      index: true,
    },
    body: {
      type: String,
      required: true,
    },
    parameterNames: {
      type: [String],
      default: [],
    },
    metaTemplateId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true, collection: "whatsappTemplates" },
);

whatsappTemplateSchema.index({ name: 1, language: 1 }, { unique: true });
whatsappTemplateSchema.index({ kind: 1, dayOffset: 1 });

export type WhatsappTemplate = InferSchemaType<typeof whatsappTemplateSchema>;
const WhatsappTemplate = registerModel("WhatsappTemplate", whatsappTemplateSchema);

export default WhatsappTemplate;
