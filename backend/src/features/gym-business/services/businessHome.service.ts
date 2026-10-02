import Member from "../models/member.model.js";
import Payment from "../models/payment.model.js";
import { computeVerification } from "./business.service.js";
import { getDashboardSummary, getListingAnalytics, getRevenueAnalytics } from "./gymAnalytics.service.js";
import { getPayoutAccount } from "./payoutAccount.service.js";
import { getSubscription } from "./proSubscription.service.js";
import { listCoupons } from "./coupon.service.js";
import { listPlans } from "./membershipPlan.service.js";
import { getMemberValiditySummary } from "./member.service.js";
import { getBusinessProfileOptional } from "./business.service.js";
import { getBusinessEntitlements } from "./entitlement.service.js";
import { getVisitStats } from "./brandPage.service.js";
import { getWallet } from "./whatsapp.service.js";
import { userInboxService } from "../../notifications/index.js";
import { getPublicWebBaseUrl } from "../../../constants/index.js";
import { logger } from "../../../utils/logger.util.js";
import type { IBusiness, BusinessHomeSummary } from "../types/index.js";
import type { ServiceParams } from "../../../types/service.util.js";

const EARNINGS_LABEL = "Earnings this Month";

const formatInr = (amount: number): string => {
  const value = Number.isFinite(amount) ? amount : 0;
  return `₹ ${value.toLocaleString("en-IN")}`;
};

const settledValue = <T>(result: PromiseSettledResult<T>, fallback: T, label: string): T => {
  if (result.status === "fulfilled") return result.value;
  logger.warn(`[businessHome] ${label} failed; using fallback`, {
    message: result.reason instanceof Error ? result.reason.message : String(result.reason),
  });
  return fallback;
};

const buildShareUrl = (slug: string | null): string | null => {
  if (!slug) return null;
  const base = getPublicWebBaseUrl();
  return base ? `${base}/gym/${slug}` : `/gym/${slug}`;
};

export const getBusinessHomeSummary = async ({
  businessId,
  ownerId,
  business,
}: ServiceParams): Promise<BusinessHomeSummary> => {
  const profile = business as IBusiness;
  const slug = profile.slug ? String(profile.slug) : null;

  const [
    dashboardRes,
    payoutRes,
    entitlementRes,
    unreadRes,
    pendingPayRes,
    memberRes,
    visitsRes,
    walletRes,
  ] = await Promise.allSettled([
    getDashboardSummary({ businessId }),
    getPayoutAccount({ businessId }).catch(() => null),
    getBusinessEntitlements({ businessId }),
    ownerId ? userInboxService.getUnreadCount(String(ownerId)) : Promise.resolve(0),
    Payment.countDocuments({ businessId, status: "PENDING" }),
    Member.countDocuments({ businessId, isDeleted: false }),
    getVisitStats({ businessId }),
    getWallet({ businessId }),
  ]);

  const dashboard = settledValue(
    dashboardRes as PromiseSettledResult<{ monthlyRevenue: number }>,
    { monthlyRevenue: 0 },
    "dashboard",
  );
  const payoutAccount = settledValue(payoutRes, null, "payout");
  const entitlements = settledValue(
    entitlementRes as PromiseSettledResult<{ isPro: boolean }>,
    { isPro: false },
    "entitlement",
  );
  const unreadCount = settledValue(unreadRes, 0, "unreadCount");
  const pendingPayments = settledValue(pendingPayRes, 0, "pendingPayments");
  const memberCount = settledValue(memberRes, 0, "members");
  const visitStats = settledValue(visitsRes, { visitsToday: 0, visitsLast7Days: 0, visitsTotal: 0 }, "visits");
  const wallet = settledValue(
    walletRes,
    { creditsLeft: 0, memberCount: 0, hasEntitlement: false },
    "wallet",
  );
  const hasPro = Boolean(entitlements.isPro);
  const hasWhatsapp = hasPro || Boolean(wallet.hasEntitlement);

  const payoutForVerification = payoutAccount
    ? {
        isConfigured: Boolean(
          (payoutAccount as { maskedAccountNumber?: string }).maskedAccountNumber,
        ),
        verificationStatus: String(
          (payoutAccount as { verificationStatus?: string }).verificationStatus || "",
        ),
      }
    : null;

  const verification = computeVerification({
    business: profile,
    payoutAccount: payoutForVerification,
  });

  const amount = Number(dashboard.monthlyRevenue) || 0;

  return {
    business: {
      id: String(profile._id),
      businessName: String(profile.businessName || ""),
      slug,
      logo: profile.logo ?? null,
      status: profile.status,
    },
    verification: {
      isVerified: verification.isVerified,
      badgeLabel: verification.badgeLabel,
      progressPercent: verification.progressPercent,
    },
    earnings: {
      period: "THIS_MONTH",
      label: EARNINGS_LABEL,
      amount,
      currency: "INR",
      formattedAmount: formatInr(amount),
    },
    brandPage: {
      slug,
      shareUrl: buildShareUrl(slug),
      visitsToday: Number(visitStats.visitsToday) || 0,
    },
    whatsapp: {
      creditsLeft: Number(wallet.creditsLeft) || 0,
      hasEntitlement: Boolean(hasWhatsapp),
      memberCount,
    },
    hasPro,
    notifications: {
      unreadCount: Number(unreadCount) || 0,
    },
    quickActions: [
      { id: "add_listing", label: "Add listing", route: "organizeCreate", badgeCount: 0 },
      {
        id: "record_payment",
        label: "Record Payment",
        route: "manualPayments",
        badgeCount: pendingPayments,
      },
      { id: "add_plans", label: "Add Plans", route: "createPlan", badgeCount: 0 },
    ],
  };
};

const EMPTY_MEMBER_VALIDITY = {
  activeCount: 0,
  expiringSoonCount: 0,
  expiredCount: 0,
  pendingPaymentCount: 0,
};

/**
 * Production gym dashboard bundle used by the current mobile client.
 * GET /api/v1/business/dashboard-summary
 */
export const getOwnerPlanDashboard = async ({
  ownerId,
  businessId,
  business,
  queryParams,
}: ServiceParams) => {
  let profile = (business as IBusiness | null) || null;
  let resolvedBusinessId = businessId;

  if (!profile && ownerId) {
    profile = (await getBusinessProfileOptional({ ownerId })) as IBusiness | null;
    if (profile?._id) resolvedBusinessId = profile._id;
  }

  if (!profile || !resolvedBusinessId) {
    let proSubscription = null;
    try {
      proSubscription = await getSubscription({ userId: ownerId });
    } catch {
      proSubscription = null;
    }
    return {
      profile: null,
      memberValidity: EMPTY_MEMBER_VALIDITY,
      revenue: null,
      coupons: [],
      proSubscription,
      payoutAccount: null,
      membershipPlans: [],
      listingAnalytics: null,
    };
  }

  const [
    memberValidityRes,
    revenueRes,
    couponsRes,
    proRes,
    payoutRes,
    plansRes,
    listingAnalyticsRes,
  ] = await Promise.allSettled([
    getMemberValiditySummary({ businessId: resolvedBusinessId }),
    getRevenueAnalytics({ businessId: resolvedBusinessId, queryParams }),
    listCoupons({ businessId: resolvedBusinessId, paginationParams: { page: 1, limit: 100 } }),
    getSubscription({ businessId: resolvedBusinessId, userId: ownerId }),
    getPayoutAccount({ businessId: resolvedBusinessId }).catch(() => null),
    listPlans({ businessId: resolvedBusinessId, paginationParams: { page: 1, limit: 100 } }),
    getListingAnalytics({ businessId: resolvedBusinessId, queryParams }),
  ]);

  if (couponsRes.status === "rejected") {
    logger.warn("[businessHome] coupons failed; using fallback", {
      message: couponsRes.reason instanceof Error ? couponsRes.reason.message : String(couponsRes.reason),
    });
  }
  if (plansRes.status === "rejected") {
    logger.warn("[businessHome] plans failed; using fallback", {
      message: plansRes.reason instanceof Error ? plansRes.reason.message : String(plansRes.reason),
    });
  }

  return {
    profile,
    memberValidity: settledValue(memberValidityRes, null, "memberValidity"),
    revenue: settledValue(revenueRes, null, "revenue"),
    coupons: couponsRes.status === "fulfilled" ? couponsRes.value.coupons : [],
    proSubscription: settledValue(proRes, null, "pro"),
    payoutAccount: settledValue(payoutRes, null, "payout"),
    membershipPlans: plansRes.status === "fulfilled" ? plansRes.value.plans : [],
    listingAnalytics: settledValue(listingAnalyticsRes, null, "listingAnalytics"),
  };
};

export default {
  getBusinessHomeSummary,
  getOwnerPlanDashboard,
};
