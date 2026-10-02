import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const eventPlanSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    price: { type: Number, default: null },
    dailyStepTarget: { type: Number, default: null },
    durationDays: { type: Number, default: null },
    distanceKm: { type: Number, default: null },
  },
  { _id: false },
);

const eventCatalogItemSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: null },
    type: { type: String, required: true, index: true },
    price: { type: Number, default: null },
    billingLabel: { type: String, default: null },
    requiresWarriorPass: { type: Boolean, default: false },
    hasLeaderboard: { type: Boolean, default: false },
    color: { type: String, default: null },
    heroAsset: { type: String, default: null },
    description: { type: String, default: null },
    rules: { type: [String], default: [] },
    plans: { type: [eventPlanSchema], default: [] },
    createdByUid: { type: String, default: null, index: true },
    rewardType: { type: String, default: null },
    eventType: { type: String, default: null, index: true },
    customMeta: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export type EventPlan = InferSchemaType<typeof eventPlanSchema>;
export type EventCatalogItem = InferSchemaType<typeof eventCatalogItemSchema>;

const EventCatalogItemModel = registerModel(
  "EventCatalogItem",
  eventCatalogItemSchema,
);

export default EventCatalogItemModel;
