import type { ProSubscriptionInfo, ProSubscriptionStatus } from "@/types/gym/proSubscription.types";

const LIVE_PRO_STATUSES: ProSubscriptionStatus[] = ["ACTIVE", "TRIAL", "PAUSED"];

export const isLiveProStatus = (status?: string | null): boolean =>
  Boolean(status && LIVE_PRO_STATUSES.includes(status as ProSubscriptionStatus));

export const isLiveProSubscription = (
  sub?: Pick<ProSubscriptionInfo, "isPro" | "status"> | null,
): boolean => Boolean(sub?.isPro === true && isLiveProStatus(sub.status));
