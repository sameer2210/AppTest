import { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const ledgerEntrySchema = new Schema(
  {
    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    refId: {
      type: String,
      default: null,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const whatsappWalletSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    ledger: {
      type: [ledgerEntrySchema],
      default: [],
    },
  },
  { timestamps: true },
);

export type WhatsappWallet = InferSchemaType<typeof whatsappWalletSchema>;
const WhatsappWallet = registerModel("WhatsappWallet", whatsappWalletSchema);

export default WhatsappWallet;
