export type PlanBillingCycle = "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
export type PlanDurationUnit = "DAYS" | "MONTHS" | "YEARS";
export type PlanStatus = "ACTIVE" | "DRAFT" | "STOPPED";

export interface MembershipPlan {
  _id: string;
  id?: string;
  businessId?: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: PlanBillingCycle;
  duration: number;
  durationUnit: PlanDurationUnit;
  isFreeTrial: boolean;
  trialDuration?: number;
  convertToPlanId?: string | null;
  perks: string[];
  status: PlanStatus;
  isBought?: boolean;
  totalSold?: number;
  activeMembersCount?: number;
  totalRevenue?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePlanInput {
  name: string;
  price: number;
  currency?: string;
  billingCycle: PlanBillingCycle;
  duration: number;
  durationUnit?: PlanDurationUnit;
  isFreeTrial?: boolean;
  trialDuration?: number;
  convertToPlanId?: string | null;
  perks?: string[];
  status?: PlanStatus;
}

export interface UpdatePlanInput {
  name?: string;
  price?: number;
  currency?: string;
  billingCycle?: PlanBillingCycle;
  duration?: number;
  durationUnit?: PlanDurationUnit;
  isFreeTrial?: boolean;
  trialDuration?: number;
  convertToPlanId?: string | null;
  perks?: string[];
  status?: PlanStatus;
}

export type MembershipStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "PAUSED";

export interface MembershipEntity {
  _id: string;
  id?: string;
  businessId: string;
  memberId: string | { _id: string; name: string; phone?: string; email?: string };
  planId: string | MembershipPlan;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  priceAtPurchase: number;
  discountAmount: number;
  finalAmount: number;
  couponId?: string | null;
  autoRenew: boolean;
  renewalStatus: "NONE" | "SCHEDULED" | "FAILED" | "RENEWED";
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignMembershipInput {
  planId: string;
  startDate?: string;
  endDate?: string;
  couponCode?: string;
  couponId?: string;
  discountAmount?: number;
  finalAmount?: number;
  autoRenew?: boolean;
  notes?: string;
}

export interface UpdateMembershipInput {
  startDate?: string;
  endDate?: string;
  status?: MembershipStatus;
  autoRenew?: boolean;
  notes?: string;
}

export interface ListMembershipsQuery {
  page?: number;
  limit?: number;
  memberId?: string;
  planId?: string;
  status?: MembershipStatus | "ALL";
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "1" | "-1";
}
