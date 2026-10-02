import { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const whatsappContactSchema = new Schema(
  {
    phoneE164: {
      type: String,
      required: true,
      trim: true,
    },
    waId: {
      type: String,
      default: null,
      trim: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      default: null,
      index: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      default: null,
      index: true,
    },
    lastInboundAt: {
      type: Date,
      default: null,
    },
    lastOutboundAt: {
      type: Date,
      default: null,
    },
    optIn: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: "whatsappContacts" },
);

whatsappContactSchema.index({ phoneE164: 1 }, { unique: true });
whatsappContactSchema.index({ waId: 1 }, { unique: true, sparse: true });

export type WhatsappContact = InferSchemaType<typeof whatsappContactSchema>;
const WhatsappContact = registerModel("WhatsappContact", whatsappContactSchema);

export default WhatsappContact;
