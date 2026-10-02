import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { registerModel } from "../../../types/mongoose.util.js";

const userNotificationSchema = new Schema(
  {
    uid: { type: String, required: true, index: true },
    tag: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    eventKey: { type: String, default: null, index: true },
    /** Optional structured payload (e.g. opinion poll results for expandable inbox cards). */
    data: { type: Schema.Types.Mixed, default: null },
    dismissedAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userNotificationSchema.index({ uid: 1, dismissedAt: 1, createdAt: -1 });

export type UserNotification = InferSchemaType<typeof userNotificationSchema>;
const UserNotification = registerModel("UserNotification", userNotificationSchema);

export default UserNotification;
