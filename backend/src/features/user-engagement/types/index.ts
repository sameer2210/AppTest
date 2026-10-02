import type { Types } from "mongoose";

export interface IFeedback {
  _id?: Types.ObjectId | string;
  userId: string;
  rating?: number | null;
  feedback: string;
  category?: "APP_ISSUE" | "FEATURE_REQUEST" | "GENERAL" | "COMPLAINT" | string;
  status?: "OPEN" | "REVIEWED" | "RESOLVED" | "CLOSED";
  metadata?: Record<string, unknown>;
  resolvedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SubmitFeedbackParams {
  userId?: string;
  uid?: string;
  requesterUid?: string;
  isLiked?: boolean;
  rating?: number;
  feedback?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}
