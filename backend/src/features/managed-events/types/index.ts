import type { Types, WithMongoId } from "../../../types/mongoose.util.js";
import type { StronEvent } from "../models/stronEvent.model.js";
import type { StronParticipation } from "../models/stronParticipation.model.js";
import type { StronOrganizer } from "../models/stronOrganizer.model.js";
import type { StronSettlement } from "../models/stronSettlement.model.js";
import type { StronReward } from "../models/stronReward.model.js";
import type { StronFaceOffMatch } from "../models/stronFaceOffMatch.model.js";
import type { StronKingOfHillGroup } from "../models/stronKingOfHillGroup.model.js";

// Canonical Domain Entity Types (Single Source of Truth, derived from Schema)
export type IStronEvent = WithMongoId<StronEvent>;
export type IStronParticipation = WithMongoId<StronParticipation>;
export type IStronOrganizer = WithMongoId<StronOrganizer>;
export type IStronSettlement = WithMongoId<StronSettlement>;
export type IStronReward = WithMongoId<StronReward>;
export type IStronFaceOffMatch = WithMongoId<StronFaceOffMatch>;
export type IStronKingOfHillGroup = WithMongoId<StronKingOfHillGroup>;

// Re-export Schema Types directly for model consumers
export type {
  StronEvent,
  StronParticipation,
  StronOrganizer,
  StronSettlement,
  StronReward,
  StronFaceOffMatch,
  StronKingOfHillGroup,
};

// Domain Status and Enum Unions (Derived directly from Schema fields)
export type StronEventFormat = StronEvent["format"];
export type StronEventStatus = StronEvent["status"];
export type ParticipationStatus = StronParticipation["status"];
export type SettlementStatus = StronSettlement["status"];
export type RewardType = StronReward["type"];
export type OrganizerVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED" | "UNVERIFIED";

// Service Types (Active across managed-events services, zero any!)
export type EventDoc = Omit<Partial<IStronEvent>, "ticketTypes"> & {
  _id?: Types.ObjectId | string;
  id?: string;
  eventKey?: string;
  key?: string;
  status?: string;
  title?: string;
  format?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  registrationStartDate?: Date | null;
  registrationEndDate?: Date | null;
  entryFee?: number;
  pricePlans?: Record<string, unknown>[];
  ticketTypes?: Array<Record<string, unknown>> | null;
  organizerUid?: string;
  currentParticipantsCount?: number;
  registrationCount?: number;
  maxParticipants?: number;
  soldOut?: boolean;
  marathonMode?: string | null;
  destination?: string | null;
  virtualLink?: string | null;
  successfulDaysRequired?: number | null;
  durationDays?: number | null;
  publishedAt?: Date | null;
  markModified?: (path: string) => void;
  save?: () => Promise<unknown>;
};

export type FaceOffSide = {
  uid?: string;
  isBot?: boolean;
  steps?: number;
  baselineSteps?: number;
  botTargetSteps?: number;
  user?: Record<string, unknown>;
  [key: string]: unknown;
};

export type FaceOffMatchDoc = Omit<Partial<IStronFaceOffMatch>, "decidedBy"> & {
  _id?: Types.ObjectId | string;
  roundNumber?: number;
  status?: string;
  winnerUid?: string | null;
  decidedBy?: "ko" | "day_end" | "tie" | string | null;
  completedAt?: Date | null;
  koAt?: Date | null;
  eventKey?: string;
  weekKey?: string;
  dayKey?: string;
  playerA?: FaceOffSide;
  playerB?: FaceOffSide;
  user1?: FaceOffSide;
  user2?: FaceOffSide;
  save?: () => Promise<unknown>;
};

export type StronFormatKey =
  | "face_off"
  | "king_of_the_hill"
  | "marathon"
  | "step_challenge"
  | string;

export type TransactionDoc = {
  _id?: Types.ObjectId | string | unknown;
  uid?: string;
  eventKey?: string;
  planId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  status?: string;
  amount?: number;
  ticketPrice?: number;
  gatewayFee?: number;
  platformCommission?: number;
  organizerNet?: number;
  refundAmount?: number;
  refundStatus?: string;
  save?: () => Promise<unknown>;
  [key: string]: unknown;
};

import type { BaseRegistrationDoc } from "../../../types/domain.base.js";
export type RegistrationDoc = BaseRegistrationDoc;

export type StepParticipation = Omit<
  Partial<IStronParticipation>,
  "ticketTypeId" | "dailyStepTarget"
> & {
  _id?: Types.ObjectId | string;
  eventKey?: string;
  uid?: string;
  totalStepsAccumulated?: number;
  eventDayAnchors?: Map<string, number> | Record<string, unknown> | null;
  eventDaySteps?: Map<string, number> | Record<string, unknown> | null;
  markModified?: (path: string) => void;
  baselineDayKey?: string | null;
  baselineSteps?: number | null;
  trackingDayKey?: string | null;
  dailyStepTarget?: number | null;
  successfulDayKeys?: unknown;
  successfulDays?: number | null;
  status?: string;
  accumulatedSteps?: number | null;
  lastSettledDayKey?: string | null;
  leaderboardSteps?: number | null;
  lastSyncedAt?: Date | null;
  requiredDays?: number | null;
  ticketTypeId?: string | null;
  completedAt?: Date | null;
  save?: () => Promise<unknown>;
};

export type ParticipationLike = StepParticipation;
