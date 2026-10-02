import { log, logError } from "@/config/devLogger";
import { captureEvent } from "@/analytics/posthog/events";
import { getPublicShareBaseUrl } from "./shareBaseUrl";
import { shareMessageWithLink } from "./shareMessage";

type ShareablePlan = {
  _id?: string;
  id?: string;
  name: string;
  price?: number;
  duration?: number;
  durationUnit?: string;
  perks?: string[];
};

export const planShareBaseUrl = (): string => getPublicShareBaseUrl();

/** Public HTTPS plan share URL — e.g. https://stron.in/plan/:id */
export const buildPlanShareUrl = (planId: string): string => {
  const id = planId.trim();
  return id ? `${getPublicShareBaseUrl()}/plan/${encodeURIComponent(id)}` : "";
};

export const buildPlanDeepLink = (planId: string): string => {
  const id = planId.trim();
  return id ? `stron://plan/${encodeURIComponent(id)}` : "";
};

export const sharePlan = async (plan: ShareablePlan): Promise<void> => {
  const planId = String(plan._id || plan.id || "").trim();
  if (!planId) return;

  const shareUrl = buildPlanShareUrl(planId);
  const priceText = `₹${Number(plan.price || 0).toLocaleString("en-IN")}`;
  const durationText = `${plan.duration ?? ""} ${
    plan.durationUnit?.toLowerCase() === "month" || plan.durationUnit?.toLowerCase() === "months"
      ? "Month"
      : plan.durationUnit || "Month"
  }`.trim();
  const perksText =
    Array.isArray(plan.perks) && plan.perks.length > 0 ? `\nPerks: ${plan.perks.join(" • ")}` : "";

  const message = `Check out the "${plan.name}" membership plan (${priceText} for ${durationText}) on STRON!${perksText}\n\nJoin here: ${shareUrl}`;

  try {
    const result = await shareMessageWithLink({ message, url: shareUrl, title: plan.name });
    captureEvent("plan_shared", { plan_id: planId, plan_name: plan.name });
    log("[sharePlan]", result);
  } catch (error) {
    logError("[sharePlan] failed", error);
  }
};
