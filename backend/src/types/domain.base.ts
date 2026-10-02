import type { Types } from "mongoose";

/**
 * Standard Mongoose document audit and identity fields.
 */
export interface BaseEntity {
  _id?: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Entity scoped to an authenticated user.
 */
export interface UserScopedEntity extends BaseEntity {
  uid: string;
}

/**
 * Standard client request trace context (IP, headers, forwarding).
 */
export interface RequestTraceContext {
  ip?: string | null;
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * Standard query or request params identified by userId / requesterUid.
 */
export interface UserIdentifiedParams {
  userId: string;
  requesterUid?: string;
}

/**
 * Shared parameters scoped to a specific race ID.
 */
export interface RaceScopedParams {
  raceId: string;
  requesterUid?: string;
}

/**
 * Shared registration document shape across event and payment domains.
 */
export interface BaseRegistrationDoc {
  _id?: Types.ObjectId | string | unknown;
  eventKey?: string;
  uid?: string;
  status?: string;
  paymentStatus?: string;
  registrationStatus?: string;
  currentStepCount?: number | null;
  participantInfo?: unknown;
  couponCode?: string | null;
  couponDiscount?: number;
  ticketNumber?: string | null;
  qrCode?: string | null;
  save?: () => Promise<unknown>;
  [key: string]: unknown;
}
