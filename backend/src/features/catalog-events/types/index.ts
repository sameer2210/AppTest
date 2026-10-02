import type { Moment } from "moment-timezone";
import type { Types, WithMongoId } from "../../../types/mongoose.util.js";
import type {
  EventCatalogItem,
  EventPlan as SchemaEventPlan,
} from "../models/eventCatalogItem.model.js";
import type { EventEnrollment } from "../models/eventEnrollment.model.js";
import type { Registration } from "../models/registration.model.js";

// Canonical Domain Entity Types (Single Source of Truth, derived from Schema)
export type IEventCatalogItem = WithMongoId<EventCatalogItem>;
export type IEventEnrollment = WithMongoId<EventEnrollment>;
export type IRegistration = WithMongoId<Registration>;
export type IEventPlan = SchemaEventPlan;

// Re-export Schema Types directly for model consumers
export type { EventCatalogItem, EventEnrollment, Registration };

// Domain Status and Enum Unions (Derived directly from Schema fields)
export type EnrollmentStatus = EventEnrollment["status"];
export type EnrollmentPaymentStatus = EventEnrollment["paymentStatus"];
export type RegistrationPaymentStatus = Registration["paymentStatus"];
export type RegistrationStatus = Registration["registrationStatus"];

// Service Types (Active across catalog-events services, zero any!)
export type EventPlan = SchemaEventPlan & {
  id?: string;
  price?: number | null;
  label?: string;
  durationDays?: number | null;
  dailyStepTarget?: number | null;
  distanceKm?: number | null;
  [key: string]: unknown;
};

export type EventDefinition = Omit<Partial<IEventCatalogItem>, "plans" | "_id"> & {
  _id?: Types.ObjectId | string;
  key?: string;
  eventType?: string | null;
  title?: string;
  subtitle?: string | null;
  price?: number | null;
  distanceKm?: number;
  requiresWarriorPass?: boolean;
  bannerImage?: string;
  rules?: string[];
  plans?: EventPlan[];
  customMeta?: Record<string, unknown>;
  subtypes?: string[];
  [key: string]: unknown;
};

export type EnrollmentRow = Partial<IEventEnrollment> & {
  uid?: string;
  userId?: string;
  eventKey?: string;
  eventType?: string;
  status?: string;
  bibNumber?: string | null;
  _id?: unknown;
  seasonKey?: string | null;
  enrolledAt?: Date | string;
  updatedAt?: Date;
  completedAt?: Date | string | null;
  eliminatedAt?: Date | string | null;
  abandonedAt?: Date | string | null;
  leaderboardSteps?: number;
  currentCycleSteps?: number;
  lastAppliedDayKey?: string | null;
  expiresAt?: Date | null;
  targetDays?: number;
  targetStepsPerDay?: number;
  dailyStepTarget?: number;
  qualifiedDays?: number;
  enrollmentStartTodaySteps?: number;
  distanceKm?: number;
  targetDistanceKm?: number;
  progressPercentage?: number;
  totalDistanceCoveredKm?: number;
  totalCaloriesBurned?: number;
  totalStepsAccumulated?: number;
  daysCompleted?: number;
  currentDaySteps?: number;
  dailyLogs?: Record<string, unknown>[];
  history?: Record<string, unknown>[];
  streak?: number;
  lastActiveDate?: string | null;
  nextMilestoneTarget?: number;
  milestoneAchieved?: boolean;
  certificateIssued?: boolean;
  toObject?: () => Record<string, unknown>;
  save?: () => Promise<unknown>;
  [key: string]: unknown;
};

export type EnrollmentDoc = EnrollmentRow & {
  markModified?: (path: string) => void;
  save?: () => Promise<unknown>;
};

export type ComputeEnrollmentDefaultsParams = {
  event: EventDefinition;
  plan: EventPlan | null;
  now?: Moment | Date | string | number;
  planId?: string | null;
  paymentAmountOverride?: number | null;
  enrollmentStartTodaySteps?: number;
  currentStepCount?: number | null;
};

export type EventUserPlanParams = {
  uid: string;
  userId?: string;
  eventKey: string;
  planId?: string | null;
  requestCountryCode?: string | null;
  currentStepCount?: number | null;
};

export type EnrollUserParams = EventUserPlanParams & {
  autoEnrolled?: boolean;
  paymentAmountOverride?: number | null;
  couponCode?: string | null;
  couponEventType?: string | null;
  couponSubType?: string | null;
  isCouponBased?: boolean;
  forceFree?: boolean;
  countryCode?: string | null;
};

export type RedeemCouponParams = EventUserPlanParams & {
  couponCode: string;
};

export type DailyMaintenanceParams = {
  eventKey?: string;
  dateString?: string | null;
  users?: Record<string, unknown>[];
  archiveDate?: Date;
  currentDate?: Date;
};

export type CatalogEvent = Omit<EventDefinition, "plans"> & {
  plans?: EventPlan[] | Record<string, unknown>[];
  toObject?: () => Record<string, unknown>;
};
