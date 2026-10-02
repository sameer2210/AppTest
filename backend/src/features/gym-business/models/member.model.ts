import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const memberSchema = new Schema(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    profileImage: {
      type: String,
      default: null,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "BLOCKED"],
      default: "ACTIVE",
    },
    notes: {
      type: String,
      default: null,
    },
    lastReminderSentAt: {
      type: Date,
      default: null,
    },
    blacklistedAt: {
      type: Date,
      default: null,
    },
    blacklistedBy: {
      type: String,
      default: null,
      trim: true,
    },
    blacklistReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Compound indexes for multitenant isolation, uniqueness and query performance
memberSchema.index(
  { businessId: 1, phone: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
memberSchema.index({ businessId: 1, email: 1 });
memberSchema.index({ businessId: 1, status: 1 });
memberSchema.index({ businessId: 1, isDeleted: 1, createdAt: -1 });

export type Member = InferSchemaType<typeof memberSchema>;
const Member = registerModel("Member", memberSchema);

export default Member;
