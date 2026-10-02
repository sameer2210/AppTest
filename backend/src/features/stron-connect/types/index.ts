import type { Types } from "mongoose";

export type ScanTargetType =
  | "GYM_CHECKIN"
  | "EVENT_CHECKIN"
  | "USER_CONNECT"
  | "STATION"
  | string;

export interface IStronConnectScan {
  _id?: Types.ObjectId | string;
  scannerUid: string;
  targetUid?: string | null;
  targetType: ScanTargetType;
  businessId?: Types.ObjectId | string | null;
  eventKey?: string | null;
  scanPayload?: string | null;
  status: "SUCCESS" | "FAILED" | "DUPLICATE" | "INVALID";
  metadata?: Record<string, unknown>;
  scannedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DispatchScanInput {
  scannerUid: string;
  qrPayload: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
}

export interface ConnectProfileData {
  uid: string;
  username: string;
  profileImageUrl?: string | null;
  stepGoal?: number;
  todaysStepCount?: number;
  connectCode: string;
  connectCodeCreatedAt?: Date;
}
