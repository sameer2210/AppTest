import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const openingHoursSchema = new Schema(
  {
    day: {
      type: String,
      enum: [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ],
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    openTime: {
      type: String,
      default: null,
    },
    closeTime: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);

const businessSchema = new Schema(
  {
    ownerId: {
      type: String,
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    bio: {
      type: String,
      maxlength: 500,
      default: null,
      trim: true,
    },
    bannerUrl: {
      type: String,
      default: null,
    },
    galleryUrls: {
      type: [String],
      default: [],
      validate: {
        validator: (value: unknown) =>
          Array.isArray(value) && value.length <= 7 && value.every((item) => typeof item === "string"),
        message: "A gym gallery can have at most 7 photos.",
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verificationSource: {
      type: String,
      enum: ["ADMIN", "AUTO"],
      default: null,
    },
    logo: {
      type: String,
      default: null,
    },
    location: {
      type: String,
      default: null,
      trim: true,
    },
    mapLink: {
      type: String,
      default: null,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    services: {
      type: [String],
      default: [],
    },
    openingHours: {
      type: [openingHoursSchema],
      default: () => [
        { day: "MONDAY", isAvailable: true, openTime: "06:00", closeTime: "22:00" },
        { day: "TUESDAY", isAvailable: true, openTime: "06:00", closeTime: "22:00" },
        { day: "WEDNESDAY", isAvailable: true, openTime: "06:00", closeTime: "22:00" },
        { day: "THURSDAY", isAvailable: true, openTime: "06:00", closeTime: "22:00" },
        { day: "FRIDAY", isAvailable: true, openTime: "06:00", closeTime: "22:00" },
        { day: "SATURDAY", isAvailable: true, openTime: "06:00", closeTime: "22:00" },
        { day: "SUNDAY", isAvailable: false, openTime: null, closeTime: null },
      ],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true },
);

businessSchema.index({ businessName: "text", location: "text" });

export type Business = InferSchemaType<typeof businessSchema>;
const Business = registerModel("Business", businessSchema);

export default Business;
