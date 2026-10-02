import { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";
import { WHATSAPP_MESSAGE_STATUSES } from "../../../constants/index.js";
import {
  WHATSAPP_MESSAGE_DIRECTIONS,
  WHATSAPP_MESSAGE_KINDS,
  WHATSAPP_MESSAGE_TYPES,
} from "../../../constants/whatsapp.constants.js";

const whatsappMessageSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      default: null,
      index: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsappAccount",
      default: null,
    },
    reminderId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsappReminder",
      default: null,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsappContact",
      default: null,
    },
    type: {
      type: String,
      enum: WHATSAPP_MESSAGE_TYPES,
      required: true,
    },
    direction: {
      type: String,
      enum: WHATSAPP_MESSAGE_DIRECTIONS,
      default: "OUTBOUND",
      index: true,
    },
    kind: {
      type: String,
      enum: WHATSAPP_MESSAGE_KINDS,
      default: "TEMPLATE",
    },
    templateName: {
      type: String,
      default: null,
    },
    to: {
      type: String,
      default: null,
    },
    from: {
      type: String,
      default: null,
    },
    waId: {
      type: String,
      default: null,
    },
    body: {
      type: String,
      required: true,
      maxlength: 4096,
    },
    status: {
      type: String,
      enum: WHATSAPP_MESSAGE_STATUSES,
      default: "QUEUED",
      index: true,
    },
    creditsUsed: {
      type: Number,
      default: 1,
      min: 0,
    },
    providerMessageId: {
      type: String,
      default: null,
    },
    providerResponse: {
      type: Schema.Types.Mixed,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

whatsappMessageSchema.index({ businessId: 1, createdAt: -1 });
whatsappMessageSchema.index({ businessId: 1, type: 1, createdAt: -1 });
whatsappMessageSchema.index({ providerMessageId: 1 }, { unique: true, sparse: true });
whatsappMessageSchema.index({ reminderId: 1 }, { sparse: true });

export type WhatsappMessage = InferSchemaType<typeof whatsappMessageSchema>;
const WhatsappMessage = registerModel("WhatsappMessage", whatsappMessageSchema);

export default WhatsappMessage;
