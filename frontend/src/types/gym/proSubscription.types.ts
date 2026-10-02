export type ProBillingCycle = "MONTHLY";

export type ProSubscriptionStatus = "ACTIVE" | "INACTIVE" | "CANCELLED" | "TRIAL" | "PAUSED";

export interface ProSubscriptionInfo {
  businessId?: string;
  planCode: string;
  status: ProSubscriptionStatus;
  price?: number;
  currency?: string;
  isPro: boolean;
  isPaused?: boolean;
  pausedAt?: string;
  resumeAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  daysRemaining?: number;
  renewalText?: string;
  billingCycle?: ProBillingCycle;
  autoRenew?: boolean;
}

export interface ProFeatureEntitlements {
  platformFeePercentage: number; // 5% platform fee
  advancedAnalytics: boolean;
  customBranding: boolean;
  automatedWhatsApp: boolean;
  prioritySupport: boolean;
}
