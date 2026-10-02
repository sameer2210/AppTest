/** Shared loose types for migrated JS services (incremental strict typing). */
export type ServiceParams = Record<string, any>;

export type MongoFilter = Record<string, unknown>;

export type PaginationQuery = ServiceParams & {
  page?: number;
  limit?: number;
  skip?: number;
};

/** Populated subdoc shapes used in .lean() + .populate() calls. */
export type PopulatedPlanRef = {
  _id?: unknown;
  isFreeTrial?: boolean;
  status?: string;
  name?: string;
  billingCycle?: string;
  gatewayPlanId?: string | null;
  price?: number;
};

export type PopulatedMemberRef = {
  _id?: unknown;
  name?: string;
  phone?: string;
  email?: string;
  profileImage?: string;
  status?: string;
};

export type PopulatedBusinessRef = {
  _id?: unknown;
  name?: string;
  status?: string;
};

export const asPopulatedPlan = (ref: unknown): PopulatedPlanRef | null =>
  ref && typeof ref === "object" ? (ref as PopulatedPlanRef) : null;

export const asPopulatedMember = (ref: unknown): PopulatedMemberRef | null =>
  ref && typeof ref === "object" ? (ref as PopulatedMemberRef) : null;

/** Input for computePeriodEnd (proRenewal.util.js). */
export type ProPeriodEndParams = {
  currentPeriodEnd?: Date | string | null;
  currentPeriodStart?: Date | string | null;
  startedAt?: Date | string | null;
  createdAt?: Date | string | null;
  status?: string;
  billingCycle?: string;
  now?: Date;
};

/** Razorpay plans.create wrapper params (razorpay.service.ts). */
export type RazorpayPlanCreateParams = {
  name: string;
  amount: number;
  currency?: string;
  period?: string;
  interval?: number;
  description?: string;
  notes?: Record<string, unknown>;
};

/** Lean user fields used in connect / dashboard display. */
export type UserDisplayRef = {
  uid?: string;
  username?: string;
  name?: string;
  receiverName?: string;
  profileImageUrl?: string;
  profileImage?: string;
  connectCode?: string;
  contactNo?: string;
  phone?: string;
  phoneVerified?: boolean;
  email?: string;
};

export const asUserDisplay = (ref: unknown): UserDisplayRef | null =>
  ref && typeof ref === "object" ? (ref as UserDisplayRef) : null;

/** Connect catalog plan row (plans + synthetic service tags). */
export type ConnectPlanItem = {
  id: string;
  businessId: string;
  name: string;
  billingText: string;
  price: string;
  isBought: boolean;
  isPendingActivation?: boolean;
  statusText?: string;
  isExpired?: boolean;
  convertPayToContinue?: boolean;
  tags?: string[];
  actionText: string;
  isRegistration?: boolean;
  isFreeTrial?: boolean;
  isServiceTag?: boolean;
  trialDuration?: number;
  billingCycle?: string | null;
  membershipId?: string;
  autoRenew?: boolean;
  endDate?: unknown;
  duration?: number;
  durationUnit?: string;
};

export interface ScheduleCronOptions {
  name: string;
  cronExpression: string;
  timezone?: string;
  runOnInit?: boolean;
  task: () => Promise<void> | void;
}

export type PublicUrlContext = {
  host?: string;
  proto?: string;
  protocol?: string;
  get?: (header: string) => string | undefined;
};

