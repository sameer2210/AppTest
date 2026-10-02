import { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";
import { TZ } from "../../../constants/common.constants.js";
import {
  WHATSAPP_OUTBOUND_TYPES,
  WHATSAPP_QUEUE_DEFAULTS,
  WHATSAPP_REMINDER_STATUSES,
} from "../../../constants/whatsapp.constants.js";

const retryPolicySchema = new Schema(
  {
    maxAttempts: {
      type: Number,
      default: WHATSAPP_QUEUE_DEFAULTS.JOB_ATTEMPTS,
      min: 1,
    },
    backoffMs: {
      type: Number,
      default: WHATSAPP_QUEUE_DEFAULTS.BACKOFF_MS,
      min: 0,
    },
  },
  { _id: false },
);

const whatsappReminderSchema = new Schema(
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
    messageId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsappMessage",
      default: null,
    },
    to: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: WHATSAPP_OUTBOUND_TYPES,
      required: true,
      index: true,
    },
    templateName: {
      type: String,
      required: true,
      trim: true,
    },
    templateLanguage: {
      type: String,
      required: true,
      trim: true,
    },
    templateVariables: {
      type: [String],
      default: [],
    },
    dayOffset: {
      type: Number,
      default: null,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    timezone: {
      type: String,
      default: TZ,
    },
    status: {
      type: String,
      enum: WHATSAPP_REMINDER_STATUSES,
      default: "SCHEDULED",
      index: true,
    },
    jobId: {
      type: String,
      default: null,
    },
    providerMessageId: {
      type: String,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    retryPolicy: {
      type: retryPolicySchema,
      default: () => ({
        maxAttempts: WHATSAPP_QUEUE_DEFAULTS.JOB_ATTEMPTS,
        backoffMs: WHATSAPP_QUEUE_DEFAULTS.BACKOFF_MS,
      }),
    },
    idempotencyKey: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, collection: "whatsappReminders" },
);

whatsappReminderSchema.index({ idempotencyKey: 1 }, { unique: true });
whatsappReminderSchema.index({ businessId: 1, memberId: 1, type: 1, status: 1 });
whatsappReminderSchema.index({ providerMessageId: 1 }, { sparse: true });

export type WhatsappReminder = InferSchemaType<typeof whatsappReminderSchema>;
const WhatsappReminder = registerModel("WhatsappReminder", whatsappReminderSchema);

export default WhatsappReminder;
