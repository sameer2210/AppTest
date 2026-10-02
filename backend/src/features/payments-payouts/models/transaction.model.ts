import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const transactionSchema = new Schema({
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
  registrationId: {
    type: Schema.Types.ObjectId,
    ref: 'Registration',
    default: null,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
  },
  gateway: {
    type: String,
    default: 'razorpay',
  },
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
  },
  razorpayPaymentId: {
    type: String,
    default: null,
  },
  razorpaySignature: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
    default: 'created',
  },
  refundAmount: {
    type: Number,
    default: 0,
  },
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'processed', 'failed'],
    default: 'none',
  },
  ticketPrice: {
    type: Number,
    default: null,
  },
  gatewayFee: {
    type: Number,
    default: null,
  },
  platformCommission: {
    type: Number,
    default: null,
  },
  organizerNet: {
    type: Number,
    default: null,
  },
  listingType: {
    type: String,
    enum: ['stron_managed', 'self_managed', 'external', null],
    default: null,
  },
  receipt: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: null,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  webhookLogs: {
    type: [{
      event: { type: String },
      payload: { type: Schema.Types.Mixed },
      receivedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
}, { timestamps: true });

export type Transaction = InferSchemaType<typeof transactionSchema>;
export default registerModel("Transaction", transactionSchema);
