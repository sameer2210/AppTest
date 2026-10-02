import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const registrationSchema = new Schema({
  uid: {
    type: String,
    required: true,
    index: true,
  },
  eventKey: {
    type: String,
    required: true,
    index: true,
  },
  planId: {
    type: String,
    default: null,
  },
  currentStepCount: {
    type: Number,
    default: null,
  },
  couponCode: {
    type: String,
    default: null,
  },
  /** STRON-managed: answers collected at registration ([{ field, value }]). */
  participantInfo: {
    type: [
      {
        field: { type: String, required: true },
        value: { type: String, default: "" },
      },
    ],
    default: [],
  },
  couponDiscount: {
    type: Number,
    default: 0,
  },
  razorpayOrderId: {
    type: String,
    default: null,
    index: true,
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Success', 'Failed', 'Refunded'],
    default: 'Pending',
  },
  registrationStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Cancelled'],
    default: 'Pending',
  },
  ticketNumber: {
    type: String,
    default: null,
  },
  qrCode: {
    type: String,
    default: null,
  },
  paymentId: {
    type: Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null,
  },
}, { timestamps: true });

registrationSchema.index({ uid: 1, eventKey: 1, paymentStatus: 1 });

export type Registration = InferSchemaType<typeof registrationSchema>;
export default registerModel("Registration", registrationSchema);
