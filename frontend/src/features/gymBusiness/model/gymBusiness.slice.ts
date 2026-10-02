import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  BusinessProfileEntity,
  BusinessPlanData,
  ProSubscriptionInfo,
  PayoutAccountInfo,
  MemberValidityCounters,
  MembershipPlan,
  Coupon,
  BackendDashboardSummary,
} from "@/types/gym";
import { isLiveProSubscription } from "@/utils/proSubscription.utils";

export interface GymBusinessState {
  profile: BusinessProfileEntity | null;
  isGymOwner: boolean;
  hasPro: boolean;
  proSubscription: ProSubscriptionInfo | null;
  payoutAccount: PayoutAccountInfo | null;
  summary: BackendDashboardSummary | null;
  validityCounters: MemberValidityCounters | null;
  plans: MembershipPlan[];
  coupons: Coupon[];
  businessPlanData: BusinessPlanData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: GymBusinessState = {
  profile: null,
  isGymOwner: false,
  hasPro: false,
  proSubscription: null,
  payoutAccount: null,
  summary: null,
  validityCounters: null,
  plans: [],
  coupons: [],
  businessPlanData: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastFetchedAt: null,
};

export const gymBusinessSlice = createSlice({
  name: "gymBusiness",
  initialState,
  reducers: {
    setGymBusinessLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setGymBusinessRefreshing(state, action: PayloadAction<boolean>) {
      state.isRefreshing = action.payload;
    },
    setGymBusinessError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isLoading = false;
      state.isRefreshing = false;
    },
    setBusinessPlanData(state, action: PayloadAction<BusinessPlanData>) {
      state.businessPlanData = action.payload;
      state.isGymOwner = action.payload.isGymOwner;
      state.hasPro = action.payload.hasPro;
      state.lastFetchedAt = Date.now();
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = null;
    },
    setGymProfile(state, action: PayloadAction<BusinessProfileEntity | null>) {
      state.profile = action.payload;
      state.isGymOwner = !!action.payload;
      state.lastFetchedAt = Date.now();
    },
    updateGymProfileLocal(state, action: PayloadAction<Partial<BusinessProfileEntity>>) {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
      if (state.businessPlanData) {
        state.businessPlanData = {
          ...state.businessPlanData,
          gymProfile: {
            ...state.businessPlanData.gymProfile,
            name: action.payload.businessName || state.businessPlanData.gymProfile.name,
            address: action.payload.location || state.businessPlanData.gymProfile.address,
            phone:
              action.payload.phone !== undefined
                ? action.payload.phone
                : state.businessPlanData.gymProfile.phone,
            logoUrl:
              action.payload.logo !== undefined
                ? action.payload.logo
                : state.businessPlanData.gymProfile.logoUrl,
            tags: action.payload.services || state.businessPlanData.gymProfile.tags,
          },
        };
      }
    },
    setProSubscription(state, action: PayloadAction<ProSubscriptionInfo | null>) {
      state.proSubscription = action.payload;
      state.hasPro = isLiveProSubscription(action.payload);
      if (state.businessPlanData) {
        state.businessPlanData.hasPro = state.hasPro;
        state.businessPlanData.earnings.isPro = state.hasPro;
      }
    },
    setPayoutAccount(state, action: PayloadAction<PayoutAccountInfo | null>) {
      state.payoutAccount = action.payload;
      if (state.businessPlanData) {
        state.businessPlanData.gymProfile.isVerified =
          action.payload?.verificationStatus === "VERIFIED";
        state.businessPlanData.gymProfile.verificationProgress =
          action.payload?.verificationStatus === "VERIFIED"
            ? 100
            : action.payload?.verificationStatus === "PENDING"
              ? 60
              : 20;
      }
    },
    setDashboardSummary(state, action: PayloadAction<BackendDashboardSummary>) {
      state.summary = action.payload;
    },
    setValidityCounters(state, action: PayloadAction<MemberValidityCounters>) {
      state.validityCounters = action.payload;
      if (state.businessPlanData) {
        state.businessPlanData.memberValidity = {
          totalMembers:
            action.payload.newLeadsCount +
            action.payload.expiredCount +
            action.payload.aboutToExpireCount +
            action.payload.moreThanWeekCount,
          newLeads: action.payload.newLeadsCount,
          expired: action.payload.expiredCount,
          aboutToExpire: action.payload.aboutToExpireCount,
          moreThanWeekLeft: action.payload.moreThanWeekCount,
        };
      }
    },
    setMembershipPlans(state, action: PayloadAction<MembershipPlan[]>) {
      state.plans = action.payload;
    },
    addOrUpdateMembershipPlan(state, action: PayloadAction<MembershipPlan>) {
      const idx = state.plans.findIndex((p) => p._id === action.payload._id);
      if (idx >= 0) {
        state.plans[idx] = action.payload;
      } else {
        state.plans.unshift(action.payload);
      }
    },
    removeMembershipPlan(state, action: PayloadAction<string>) {
      state.plans = state.plans.filter((p) => p._id !== action.payload && p.id !== action.payload);
    },
    setGymCoupons(state, action: PayloadAction<Coupon[]>) {
      state.coupons = action.payload;
      if (state.businessPlanData) {
        state.businessPlanData.coupons.activeCount = action.payload.filter(
          (c) => c.status === "ACTIVE",
        ).length;
      }
    },
    addOrUpdateGymCoupon(state, action: PayloadAction<Coupon>) {
      const idx = state.coupons.findIndex((c) => c._id === action.payload._id);
      if (idx >= 0) {
        state.coupons[idx] = action.payload;
      } else {
        state.coupons.unshift(action.payload);
      }
    },
    removeGymCoupon(state, action: PayloadAction<string>) {
      state.coupons = state.coupons.filter(
        (c) => c._id !== action.payload && c.id !== action.payload,
      );
    },
    clearGymBusinessState(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setGymBusinessLoading,
  setGymBusinessRefreshing,
  setGymBusinessError,
  setBusinessPlanData,
  setGymProfile,
  updateGymProfileLocal,
  setProSubscription,
  setPayoutAccount,
  setDashboardSummary,
  setValidityCounters,
  setMembershipPlans,
  addOrUpdateMembershipPlan,
  removeMembershipPlan,
  setGymCoupons,
  addOrUpdateGymCoupon,
  removeGymCoupon,
  clearGymBusinessState,
} = gymBusinessSlice.actions;

export default gymBusinessSlice.reducer;

// Selectors
export const selectGymBusinessState = (state: { gymBusiness: GymBusinessState }) =>
  state.gymBusiness;
export const selectGymProfile = (state: { gymBusiness: GymBusinessState }) =>
  state.gymBusiness.profile;
export const selectIsGymOwner = (state: { gymBusiness: GymBusinessState }) =>
  state.gymBusiness.isGymOwner;
export const selectHasPro = (state: { gymBusiness: GymBusinessState }) => state.gymBusiness.hasPro;
export const selectProSubscription = (state: { gymBusiness: GymBusinessState }) =>
  state.gymBusiness.proSubscription;
export const selectPayoutAccount = (state: { gymBusiness: GymBusinessState }) =>
  state.gymBusiness.payoutAccount;
export const selectGymSummary = (state: { gymBusiness: GymBusinessState }) =>
  state.gymBusiness.summary;
export const selectGymValidityCounters = (state: { gymBusiness: GymBusinessState }) =>
  state.gymBusiness.validityCounters;
export const selectGymPlans = (state: { gymBusiness: GymBusinessState }) => state.gymBusiness.plans;
export const selectGymCoupons = (state: { gymBusiness: GymBusinessState }) =>
  state.gymBusiness.coupons;
export const selectBusinessPlanData = (state: { gymBusiness: GymBusinessState }) =>
  state.gymBusiness.businessPlanData;
