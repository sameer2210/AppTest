import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  memberApiService,
  planApiService,
  paymentApiService,
  proSubscriptionApiService,
  businessApiService,
  payoutApiService,
  analyticsApiService,
  couponApiService,
  membershipApiService,
  GymBusinessApi,
} from "../api/gymBusiness.api";

/* ── Plans ──────────────────────────────────────────────────────────────── */

export const listGymPlans = createAsyncThunk(
  "gymBusiness/listPlans",
  async (statusOrBusinessId?: string) => planApiService.listPlans(statusOrBusinessId),
);

export const fetchPlanByIdThunk = createAsyncThunk(
  "gymBusiness/fetchPlanById",
  async (planId: string) => planApiService.getPlanById(planId),
);

export const createPlanThunk = createAsyncThunk(
  "gymBusiness/createPlan",
  async (input: Parameters<typeof planApiService.createPlan>[0]) =>
    planApiService.createPlan(input),
);

export const updatePlanThunk = createAsyncThunk(
  "gymBusiness/updatePlan",
  async ({
    planId,
    input,
  }: {
    planId: string;
    input: Parameters<typeof planApiService.updatePlan>[1];
  }) => planApiService.updatePlan(planId, input),
);

export const stopPlanThunk = createAsyncThunk(
  "gymBusiness/stopPlan",
  async (planId: string) => planApiService.stopPlan(planId),
);

export const listMembersPreviewThunk = createAsyncThunk(
  "gymBusiness/listMembersPreview",
  async (limit?: number) => GymBusinessApi.listMembersPreview(limit),
);

/* ── Memberships (Purchased) ────────────────────────────────────────────── */

export const fetchMyPurchasedPlansThunk = createAsyncThunk(
  "gymBusiness/fetchMyPurchasedPlans",
  async () => membershipApiService.getMyPurchasedPlans(),
);

export const fetchMyPurchasedPlanByIdThunk = createAsyncThunk(
  "gymBusiness/fetchMyPurchasedPlanById",
  async (planId: string) => membershipApiService.getMyPurchasedPlanById(planId),
);

export const cancelMembershipThunk = createAsyncThunk(
  "gymBusiness/cancelMembership",
  async (membershipId: string) => membershipApiService.cancelMembership(membershipId),
);

/* ── Payments ───────────────────────────────────────────────────────────── */

export const purchaseGymPlan = createAsyncThunk(
  "gymBusiness/purchasePlan",
  async (payload: Parameters<typeof paymentApiService.purchasePlan>[0]) =>
    paymentApiService.purchasePlan(payload),
);

export const verifyGymOnlinePayment = createAsyncThunk(
  "gymBusiness/verifyOnlinePayment",
  async (payload: Parameters<typeof paymentApiService.verifyOnlinePayment>[0]) =>
    paymentApiService.verifyOnlinePayment(payload),
);

export const fetchMemberPaymentSummariesThunk = createAsyncThunk(
  "gymBusiness/fetchMemberPaymentSummaries",
  async () => paymentApiService.getMemberPaymentSummaries(),
);

export const fetchMemberPaymentHistoryThunk = createAsyncThunk(
  "gymBusiness/fetchMemberPaymentHistory",
  async (memberId: string) => paymentApiService.getMemberPaymentHistory(memberId),
);

export const recordManualPaymentThunk = createAsyncThunk(
  "gymBusiness/recordManualPayment",
  async (input: Parameters<typeof paymentApiService.recordManualPayment>[0]) =>
    paymentApiService.recordManualPayment(input),
);

export const sendPaymentReminderThunk = createAsyncThunk(
  "gymBusiness/sendPaymentReminder",
  async (memberId: string) => paymentApiService.sendPaymentReminder(memberId),
);

/* ── Members ────────────────────────────────────────────────────────────── */

export const patchMemberAutoRenew = createAsyncThunk(
  "gymBusiness/patchMemberAutoRenew",
  async ({ membershipId, enabled }: { membershipId: string; enabled: boolean }) =>
    memberApiService.patchMembershipAutoRenew(membershipId, enabled),
);

export const listMembersValidityThunk = createAsyncThunk(
  "gymBusiness/listMembersValidity",
  async (query?: Parameters<typeof memberApiService.listMembersValidity>[0]) =>
    memberApiService.listMembersValidity(query),
);

export const deleteMemberThunk = createAsyncThunk(
  "gymBusiness/deleteMember",
  async (memberId: string) => memberApiService.deleteMember(memberId),
);

/* ── Pro Subscription & Business Data ────────────────────────────────────── */

export const fetchProSubscriptionThunk = createAsyncThunk(
  "gymBusiness/fetchProSubscription",
  async () => proSubscriptionApiService.getSubscription(),
);

export const fetchProFeaturesThunk = createAsyncThunk(
  "gymBusiness/fetchProFeatures",
  async () => proSubscriptionApiService.getFeatures(),
);

export const checkProTrialEligibilityThunk = createAsyncThunk(
  "gymBusiness/checkProTrialEligibility",
  async () => proSubscriptionApiService.checkTrialEligibility(),
);

export const syncRevenueCatThunk = createAsyncThunk(
  "gymBusiness/syncRevenueCat",
  async () => proSubscriptionApiService.syncRevenueCat(),
);

export const startProTrialThunk = createAsyncThunk(
  "gymBusiness/startProTrial",
  async () => proSubscriptionApiService.activateFreeTrial(),
);

export const cancelProSubscriptionThunk = createAsyncThunk(
  "gymBusiness/cancelProSubscription",
  async (cancelReason?: string) => proSubscriptionApiService.cancelSubscription(cancelReason),
);

export const pauseProSubscriptionThunk = createAsyncThunk(
  "gymBusiness/pauseProSubscription",
  async (pauseDays?: number) => proSubscriptionApiService.pauseSubscription(pauseDays),
);

export const resumeProSubscriptionThunk = createAsyncThunk(
  "gymBusiness/resumeProSubscription",
  async () => proSubscriptionApiService.resumeSubscription(),
);

export const fetchBusinessProfileThunk = createAsyncThunk(
  "gymBusiness/fetchBusinessProfile",
  async () => businessApiService.getBusinessProfile(),
);

export const createBusinessProfileThunk = createAsyncThunk(
  "gymBusiness/createBusinessProfile",
  async (payload: Record<string, any>) => businessApiService.createBusinessProfile(payload),
);

export const updateBusinessProfileThunk = createAsyncThunk(
  "gymBusiness/updateBusinessProfile",
  async (payload: Record<string, any>) => businessApiService.updateBusinessProfile(payload),
);

export const fetchEarningsThunk = createAsyncThunk(
  "gymBusiness/fetchEarnings",
  async (params?: { year?: string }) => analyticsApiService.getAnalytics(params),
);

export const fetchGymAnalyticsThunk = createAsyncThunk(
  "gymBusiness/fetchGymAnalytics",
  async (params?: { year?: string }) => analyticsApiService.getAnalytics(params),
);

export const fetchListingAnalyticsThunk = createAsyncThunk(
  "gymBusiness/fetchListingAnalytics",
  async () => analyticsApiService.getListingAnalytics(),
);

export const fetchPayoutAccountThunk = createAsyncThunk(
  "gymBusiness/fetchPayoutAccount",
  async () => payoutApiService.getPayoutAccount(),
);

export const savePayoutAccountThunk = createAsyncThunk(
  "gymBusiness/savePayoutAccount",
  async (input: Parameters<typeof payoutApiService.savePayoutAccount>[0]) =>
    payoutApiService.savePayoutAccount(input),
);

export const saveBankDetailsOnlyThunk = createAsyncThunk(
  "gymBusiness/saveBankDetailsOnly",
  async (input: Parameters<typeof payoutApiService.saveBankDetailsOnly>[0]) =>
    payoutApiService.saveBankDetailsOnly(input),
);

/* ── Coupons ────────────────────────────────────────────────────────────── */

export const fetchCouponsThunk = createAsyncThunk(
  "gymBusiness/fetchCoupons",
  async (status?: string) => couponApiService.listCoupons(status),
);

export const createCouponThunk = createAsyncThunk(
  "gymBusiness/createCoupon",
  async (input: Parameters<typeof couponApiService.createCoupon>[0]) =>
    couponApiService.createCoupon(input),
);

export const deleteCouponThunk = createAsyncThunk(
  "gymBusiness/deleteCoupon",
  async (couponId: string) => couponApiService.deleteCoupon(couponId),
);

export const updateCouponThunk = createAsyncThunk(
  "gymBusiness/updateCoupon",
  async ({
    couponId,
    updateData,
  }: {
    couponId: string;
    updateData: Parameters<typeof couponApiService.updateCoupon>[1];
  }) => couponApiService.updateCoupon(couponId, updateData),
);

export const validateCouponThunk = createAsyncThunk(
  "gymBusiness/validateCoupon",
  async ({ code, amount = 0, planId }: { code: string; amount?: number; planId?: string }) =>
    couponApiService.validateCoupon(code, amount ?? 0, planId),
);

/* ── Business Composite Data (useBusinessPlanData) ──────────────────────── */

export const fetchMemberValiditySummaryThunk = createAsyncThunk(
  "gymBusiness/fetchMemberValiditySummary",
  async () => businessApiService.getMemberValiditySummary(),
);

export const fetchRevenueAnalyticsThunk = createAsyncThunk(
  "gymBusiness/fetchRevenueAnalytics",
  async () => businessApiService.getRevenueAnalytics(),
);

export const fetchBusinessCouponsThunk = createAsyncThunk(
  "gymBusiness/fetchBusinessCoupons",
  async () => businessApiService.getCoupons(),
);

export const fetchBusinessMembershipPlansThunk = createAsyncThunk(
  "gymBusiness/fetchBusinessMembershipPlans",
  async () => businessApiService.getMembershipPlans(),
);
