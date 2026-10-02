import { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const staffMemberSchema = new Schema(
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
      default: null,
    },
    userId: {
      type: String,
      default: null,
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
    profileImage: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["TRAINER", "MODERATOR"],
      default: "TRAINER",
    },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "ACTIVE", "REJECTED", "REMOVED"],
      default: "IN_PROGRESS",
      index: true,
    },
    initiatedBy: {
      type: String,
      enum: ["GYM", "TRAINER"],
      default: "GYM",
      index: true,
    },
    splitPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    counterOfferPercent: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    proposedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    removedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

staffMemberSchema.index(
  { businessId: 1, phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["IN_PROGRESS", "ACTIVE", "REJECTED"] },
    },
  },
);
staffMemberSchema.index({ businessId: 1, status: 1, createdAt: -1 });

export type StaffMember = InferSchemaType<typeof staffMemberSchema>;
const StaffMember = registerModel("StaffMember", staffMemberSchema);

export default StaffMember;
