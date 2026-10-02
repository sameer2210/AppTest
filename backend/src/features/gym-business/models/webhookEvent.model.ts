import { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";
import {
  WHATSAPP_WEBHOOK_EVENT_STATUSES,
  WHATSAPP_WEBHOOK_FIELDS,
} from "../../../constants/whatsapp.constants.js";

const webhookEventSchema = new Schema(
  {
    eventKey: {
      type: String,
      required: true,
    },
    field: {
      type: String,
      enum: WHATSAPP_WEBHOOK_FIELDS,
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: WHATSAPP_WEBHOOK_EVENT_STATUSES,
      default: "RECEIVED",
      index: true,
    },
    jobId: {
      type: String,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: "webhookEvents" },
);

webhookEventSchema.index({ eventKey: 1 }, { unique: true });

export type WebhookEvent = InferSchemaType<typeof webhookEventSchema>;
const WebhookEvent = registerModel("WebhookEvent", webhookEventSchema);

export default WebhookEvent;
