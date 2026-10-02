/**
 * Shared STRON Pro period-end / renewal display helpers.
 * Keep daysRemaining + renewalText logic in one place to avoid drift.
 */
import type { ProPeriodEndParams } from "../types/service.util.js";

export const computePeriodEnd = ({
  currentPeriodEnd,
  currentPeriodStart,
  startedAt,
  createdAt,
  status,
  billingCycle,
  now = new Date(),
}: ProPeriodEndParams = {}) => {
  if (currentPeriodEnd) {
    return new Date(currentPeriodEnd);
  }

  const start = currentPeriodStart || startedAt || createdAt || now;
  const computedEnd = new Date(start);

  if (status === "TRIAL") {
    computedEnd.setDate(computedEnd.getDate() + 14);
  } else if (String(billingCycle || "").toUpperCase() === "YEARLY") {
    computedEnd.setFullYear(computedEnd.getFullYear() + 1);
  } else {
    computedEnd.setMonth(computedEnd.getMonth() + 1);
  }

  return computedEnd;
};

export const computeRenewalDisplay = (
  periodEnd: Date | string | null | undefined,
  now: Date = new Date(),
) => {
  const end = periodEnd ? new Date(periodEnd) : null;
  if (!end || Number.isNaN(end.getTime())) {
    return { daysRemaining: 0, renewalText: null };
  }

  const msRemaining = end.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const renewalText =
    daysRemaining === 0
      ? "renews today"
      : `renews in ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`;

  return { daysRemaining, renewalText };
};
