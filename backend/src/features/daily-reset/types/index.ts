import type { Types } from "mongoose";

export interface IDailyHistoryEntry {
  date?: Date;
  dateKey?: string;
  stepCount?: number;
}

export interface IDailyActivityLifetime {
  totalSteps: number;
  bestDaySteps?: number;
  bestDayDate?: string | null;
}

export interface IDailyActivity {
  _id?: Types.ObjectId | string;
  uid: string;
  history: IDailyHistoryEntry[];
  lifetime: IDailyActivityLifetime;
  lastArchivedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ArchiveDayStepsParams {
  uid: string;
  archiveDate: Date;
  stepCount: number | string | null | undefined;
  context?: Record<string, unknown> | unknown;
  timezone?: string;
}

export interface ArchiveDayStepsResult {
  inserted: boolean;
  updated: boolean;
  stepCount: number;
  archiveKey?: string;
}
