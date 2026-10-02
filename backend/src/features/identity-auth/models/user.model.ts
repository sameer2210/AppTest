import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const userSchema = new Schema({
  uid: { type: String, unique: true },
  email: String,
  username: String,
  /** Stable device key for guest restore after reinstall (same device). */
  guestDeviceId: { type: String, default: null },
  guestPlatform: { type: String, default: null },
  isGuest: { type: Boolean, default: false },
  receiverName: { type: String, default: null },
  bankName: { type: String, default: null },
  bankAccountNumber: { type: String, default: null },
  bankIfscCode: { type: String, default: null },
  dob: Object,
  gender: String,
  weight: Number,
  height: Number,
  contactNo: String,
  address: { type: String, default: null },
  about: { type: String, default: null },
  /** Free-text profile location label (e.g. "Indore, Madhya Pradesh, India"). */
  location: { type: String, default: null },
  /** Short interest line shown as a chip on profile (max ~60 chars in app). */
  shortBio: { type: String, default: null },
  addressLine1: { type: String, default: null },
  city: { type: String, default: null },
  state: { type: String, default: null },
  pinCode: { type: String, default: null },
  profileImageUrl: String,
  stepGoal: Number,
  todaysStepCount: Number,
  lastKnownCountryCode: { type: String, default: null },
  lastKnownCountryUpdatedAt: { type: Date, default: null },
  timezone: { type: String, default: "Asia/Kolkata" },
  DST: { type: Boolean, default: false },
  coins: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  /** Consecutive lower sync readings — used to demote sticky poisoned day totals. */
  stepLowerStreak: { type: Number, default: 0 },
  isAnalyticsInactive: { type: Boolean, default: false },
  interestAreas: { type: [String], default: [] },
  avgDailySteps: { type: String, default: null },
  bestStepCount: { type: Number, default: 0 },
  bestStepCountDate: { type: Date, default: null },
  bestPaceSeconds: { type: Number, default: 600 }, // 10:00 per km — general shadow pace
  /** Calendar day (YYYY-MM-DD in user timezone) of last completed step race. */
  lastStepRaceDate: { type: String, default: null },
  phoneVerified: { type: Boolean, default: false },
  opinionStreak: { type: Number, default: 0 },
  lastOpinionCycleId: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  /** Single-use dynamic 5-character connect code & QR token. */
  connectCode: { type: String, default: null },
  connectCodeCreatedAt: { type: Date, default: null },
  /** Track whether user has ever activated the 14-day STRON PRO free trial. */
  hasAvailedProTrial: { type: Boolean, default: false },
  /** Track whether user has ever purchased or activated a paid STRON PRO subscription. */
  hasPurchasedPro: { type: Boolean, default: false },
  /** RevenueCat custom App User ID (Mongo `_id` string). */
  revenueCatAppUserId: { type: String, default: null },
  /** Original anonymous RevenueCat App User ID when aliased. */
  revenueCatOriginalAppUserId: { type: String, default: null },
  revenueCatAttributesSyncedAt: { type: Date, default: null },
  /** Onboarding selections — persisted for pre-fill and analytics. */
  onboardingRole: { type: String, enum: ["individual", "business"], default: null },
  onboardingBusinessName: { type: String, default: null },
  onboardingBusinessOffers: { type: [String], default: [] },
  onboardingBusinessFeatures: { type: [String], default: [] },
}, { timestamps: true });

userSchema.index(
  { connectCode: 1 },
  { unique: true, sparse: true, partialFilterExpression: { connectCode: { $type: "string" } } },
);

userSchema.index(
  { guestDeviceId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { guestDeviceId: { $type: "string" } },
  },
);

userSchema.index(
  { contactNo: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      contactNo: { $type: "string" },
      phoneVerified: true,
      isDeleted: false,
    },
  },
);

userSchema.index({ isGuest: 1, bestPaceSeconds: 1 });

export type User = InferSchemaType<typeof userSchema>;
const UserModel = registerModel("User", userSchema);
export default UserModel;
