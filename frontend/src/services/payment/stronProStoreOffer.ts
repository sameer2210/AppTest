/**
 * Read-only STRON PRO price helpers for marketing copy.
 * Checkout is RevenueCat Paywalls UI: offering `default` (trial / Paywall B) or `stron_pro_no_trial` (Paywall A).
 */

export const STRON_PRO_PREFERRED_MONTHLY_RUPEES = 999;

export type StronProOfferingsPrices = {
  monthly?: string;
  hasStoreTrial?: boolean;
  trialDays?: number;
  amount: string;
  period: string;
  cta: string;
};

type PriceLike = {
  formatted?: string;
  amountMicros?: number;
};

type PricingPhaseLike = {
  billingPeriod?: { value?: number; unit?: string };
  billingCycleCount?: number;
  price?: PriceLike;
  priceString?: string;
  offerPaymentMode?: string;
};

export type SubscriptionOptionLike = {
  id?: string;
  identifier?: string;
  isBasePlan?: boolean;
  freePhase?: PricingPhaseLike | null;
  introPhase?: PricingPhaseLike | null;
  pricingPhases?: PricingPhaseLike[];
};

const formatInr = (rupees: number) => `₹${Math.round(rupees).toLocaleString("en-IN")}`;

const rupeesFromMicros = (micros?: number) =>
  typeof micros === "number" && Number.isFinite(micros) ? micros / 1_000_000 : null;

const rupeesFromFormatted = (formatted?: string) => {
  if (!formatted) return null;
  const n = Number(String(formatted).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export const phaseRupees = (phase?: PricingPhaseLike | null): number | null => {
  if (!phase) return null;
  const fromMicros = rupeesFromMicros(phase.price?.amountMicros);
  if (fromMicros != null) return fromMicros;
  return rupeesFromFormatted(phase.price?.formatted || phase.priceString);
};

export const phaseIsFree = (phase?: PricingPhaseLike | null) => {
  if (!phase) return false;
  const rupees = phaseRupees(phase);
  if (rupees === 0) return true;
  const mode = String(phase.offerPaymentMode || "").toUpperCase();
  return mode.includes("FREE") || mode.includes("TRIAL");
};

const optionPhases = (option: SubscriptionOptionLike): PricingPhaseLike[] => {
  if (Array.isArray(option.pricingPhases) && option.pricingPhases.length) {
    return option.pricingPhases;
  }
  return [option.freePhase, option.introPhase].filter(Boolean) as PricingPhaseLike[];
};

export const optionHasFreeTrial = (option: SubscriptionOptionLike) =>
  Boolean(option.freePhase) || optionPhases(option).some(phaseIsFree);

export const optionRecurringPhase = (option: SubscriptionOptionLike): PricingPhaseLike | null => {
  const phases = optionPhases(option);
  if (!phases.length) return option.introPhase || null;
  const paid = [...phases].reverse().find((phase) => !phaseIsFree(phase));
  return paid || phases[phases.length - 1] || null;
};

const trialDaysFromPhase = (phase?: PricingPhaseLike | null) => {
  if (!phase) return 14;
  const unit = String(phase.billingPeriod?.unit || "").toUpperCase();
  const value = Number(phase.billingPeriod?.value) || 1;
  if (unit.startsWith("DAY")) return value;
  if (unit.startsWith("WEEK")) return value * 7;
  if (unit.startsWith("MONTH")) return value * 30;
  return 14;
};

const paidFallback = (fallback?: unknown) => {
  if (!fallback || typeof fallback !== "object") return fallback ?? null;
  return optionHasFreeTrial(fallback as SubscriptionOptionLike) ? null : fallback;
};

export const pickPreferredSubscriptionOption = (
  options: SubscriptionOptionLike[] | undefined,
  fallback?: unknown,
  prefs: { preferTrial?: boolean } = {},
): SubscriptionOptionLike | unknown | null => {
  const preferTrial = prefs.preferTrial !== false;
  const list = Array.isArray(options) ? options : [];
  const paidOnly = list.filter((option) => !optionHasFreeTrial(option));
  const pool = preferTrial ? list : paidOnly;
  if (!pool.length) return preferTrial ? (fallback ?? null) : paidFallback(fallback);

  let best = pool[0];
  let bestScore = -1;
  for (const option of pool) {
    let score = 0;
    if (preferTrial && optionHasFreeTrial(option)) score += 1000;
    if (!preferTrial && option.isBasePlan) score += 400;
    if (!preferTrial && !optionHasFreeTrial(option)) score += 300;
    const recurring = phaseRupees(optionRecurringPhase(option));
    if (recurring != null && Math.abs(recurring - STRON_PRO_PREFERRED_MONTHLY_RUPEES) < 0.5) {
      score += 500;
    } else if (recurring != null && recurring >= 900 && recurring <= 1100) {
      score += 200;
    }
    if (option.isBasePlan) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = option;
    }
  }
  if (preferTrial) return best || fallback || null;
  return best || paidFallback(fallback);
};

type IntroPriceLike = {
  price?: number;
  priceString?: string;
  periodNumberOfUnits?: number;
  periodUnit?: string;
};

type ProductLike = {
  priceString?: string;
  price?: number;
  introPrice?: IntroPriceLike | null;
  subscriptionOptions?: SubscriptionOptionLike[];
  defaultOption?: unknown;
};

export const defaultStronProPrices = (hasStoreTrial: boolean): StronProOfferingsPrices => ({
  monthly: formatInr(STRON_PRO_PREFERRED_MONTHLY_RUPEES),
  hasStoreTrial,
  trialDays: hasStoreTrial ? 14 : undefined,
  amount: hasStoreTrial ? "₹0" : formatInr(STRON_PRO_PREFERRED_MONTHLY_RUPEES),
  period: hasStoreTrial
    ? `for 14 days, then ${formatInr(STRON_PRO_PREFERRED_MONTHLY_RUPEES)}/mo`
    : "/month",
  cta: hasStoreTrial ? "Claim 14-day free trial" : "Upgrade to PRO",
});

export const extractStronProPrices = (
  product?: ProductLike | null,
  prefs: { preferTrial?: boolean } = {},
): StronProOfferingsPrices => {
  const preferTrial = prefs.preferTrial !== false;
  const option = pickPreferredSubscriptionOption(
    product?.subscriptionOptions,
    product?.defaultOption,
    { preferTrial },
  ) as SubscriptionOptionLike | null;

  const intro = product?.introPrice;
  const introIsFree =
    preferTrial &&
    Boolean(intro) &&
    (Number(intro?.price) === 0 || rupeesFromFormatted(intro?.priceString) === 0);

  const hasStoreTrial =
    preferTrial && (Boolean(option && optionHasFreeTrial(option)) || introIsFree);

  const recurring = option ? optionRecurringPhase(option) : null;
  const recurringRupees = phaseRupees(recurring);
  const monthly =
    recurring?.price?.formatted ||
    recurring?.priceString ||
    (recurringRupees != null ? formatInr(recurringRupees) : null) ||
    product?.priceString ||
    formatInr(STRON_PRO_PREFERRED_MONTHLY_RUPEES);

  const freePhase =
    (option && (option.freePhase || optionPhases(option).find(phaseIsFree))) || null;
  const trialDays = hasStoreTrial
    ? intro?.periodNumberOfUnits &&
      String(intro.periodUnit || "")
        .toUpperCase()
        .includes("DAY")
      ? intro.periodNumberOfUnits
      : trialDaysFromPhase(freePhase)
    : undefined;

  if (hasStoreTrial) {
    return {
      monthly,
      hasStoreTrial: true,
      trialDays,
      amount: "₹0",
      period: `for ${trialDays || 14} days, then ${monthly}/mo`,
      cta: "Claim 14-day free trial",
    };
  }

  return {
    monthly,
    hasStoreTrial: false,
    amount: monthly,
    period: "/month",
    cta: "Upgrade to PRO",
  };
};
