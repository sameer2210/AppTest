import { useState, useEffect, useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setBusinessPlanData,
  setGymProfile,
  setProSubscription,
  setGymBusinessError,
  selectBusinessPlanData,
  selectProSubscription,
} from "../../model/gymBusiness.slice";
import {
  fetchBusinessProfileThunk,
  fetchMemberValiditySummaryThunk,
  fetchRevenueAnalyticsThunk,
  fetchBusinessCouponsThunk,
  fetchProSubscriptionThunk,
  fetchPayoutAccountThunk,
  fetchBusinessMembershipPlansThunk,
  fetchListingAnalyticsThunk,
  syncRevenueCatThunk,
} from "../../model/gymBusiness.thunks";
import { selectAuthUser, selectIsAuthenticated } from "@/features/auth";
import { checkEntitlementAccessThunk } from "@/features/payments";
import { fetchMyActivity, fetchMyOrganizerEvents } from "@/features/managedEvents";
import { calculateGymProfileCompletion } from "../utils/profileCompletion";
import type {
  BusinessPlanData,
  BusinessPlanUserRole,
  GymBusinessProfile,
  EarningsSummary,
  MemberValidityMetrics,
  ListingCustomerMetrics,
  CouponSummary,
  PayoutAccountSummary,
} from "@/types/gym/businessPlan.types";
import { logError } from "@/config/devLogger";
import { isLiveProSubscription } from "@/utils/proSubscription.utils";

const formatINR = (amount: number): string => {
  if (isNaN(amount) || amount === 0) return "₹0";
  return `₹${amount.toLocaleString("en-IN")}`;
};

const DEFAULT_GUEST_DATA: BusinessPlanData = {
  role: "guest",
  isGymOwner: false,
  hasPro: false,
  earnings: {
    monthlyRevenue: 0,
    formattedRevenue: "₹0",
    platformFeePercent: 5,
    savedAmount: 0,
    formattedSavedAmount: "₹0",
    isPro: false,
    proFeaturesSummary: "WhatsApp · AI Tools",
  },
  gymProfile: {
    name: "Register Your Business",
    address: "Get listed on STRON Business",
    tags: [],
    isVerified: false,
    verificationProgress: 0,
    payoutSlaText: "Direct bank payouts within 24h",
    operatingHours: {},
  },
  memberValidity: {
    totalMembers: 0,
    newLeads: 0,
    expired: 0,
    aboutToExpire: 0,
    moreThanWeekLeft: 0,
    hasPlans: false,
    activePlansCount: 0,
  },
  listingCustomers: {
    totalCustomers: 0,
    activeCustomers: 0,
    activeListing: 0,
    totalListings: 0,
    conversionRate: 0,
    repeatUserRate: 0,
  },
  coupons: {
    activeCount: 0,
  },
};

export const useBusinessPlanData = () => {
  const dispatch = useAppDispatch();
  const cachedData = useAppSelector(selectBusinessPlanData) as BusinessPlanData | null;
  const reduxProSub = useAppSelector(selectProSubscription);
  const user = useAppSelector(selectAuthUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isGuest = Boolean(!user || user.isGuest);

  const [data, setData] = useState<BusinessPlanData | undefined>(() => {
    if (!isAuthenticated || isGuest) return DEFAULT_GUEST_DATA;
    return cachedData || undefined;
  });
  const [isLoading, setIsLoading] = useState<boolean>(
    Boolean(isAuthenticated && !isGuest && !cachedData),
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const reduxProSubRef = useRef(reduxProSub);
  reduxProSubRef.current = reduxProSub;
  const inFlightRef = useRef(false);
  const lastFetchedAtRef = useRef(0);
  const CACHE_TTL_MS = 30_000;

  // Sync cached data changes from store when not guest
  useEffect(() => {
    if (!isAuthenticated || isGuest) {
      setData(DEFAULT_GUEST_DATA);
    } else if (cachedData) {
      setData(cachedData);
    }
  }, [cachedData, isAuthenticated, isGuest]);

  useEffect(() => {
    if (!reduxProSub) return;
    const isPro = isLiveProSubscription(reduxProSub);
    setData((prev) => {
      if (
        !prev ||
        (prev.hasPro === isPro &&
          prev.earnings.platformFeePercent === 5 &&
          prev.earnings.savedAmount === 0)
      ) {
        return prev;
      }
      return {
        ...prev,
        hasPro: isPro,
        role: isPro ? "owner_pro" : "owner_free",
        earnings: {
          ...prev.earnings,
          isPro,
          platformFeePercent: 5,
          savedAmount: 0,
          formattedSavedAmount: "₹0",
          proRenewsOn: reduxProSub.currentPeriodEnd,
          proFeaturesSummary: isPro
            ? "All PRO Features Active"
            : "Upgrade for WhatsApp tools",
        },
      };
    });
  }, [reduxProSub]);

  const fetchBusinessPlanData = useCallback(
    async (isRefresh = false) => {
      // 1. Guard against unauthenticated / guest requests
      if (!isAuthenticated || !user || user.isGuest) {
        setData(DEFAULT_GUEST_DATA);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (inFlightRef.current) return;
      const now = Date.now();
      if (!isRefresh && now - lastFetchedAtRef.current < CACHE_TTL_MS) return;
      inFlightRef.current = true;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        // 2. Fetch business profile
        const businessRes = await dispatch(fetchBusinessProfileThunk()).unwrap();

        if (
          !businessRes ||
          businessRes.code === "business_not_found" ||
          !businessRes.success ||
          !businessRes.data
        ) {
          // Authenticated non-owner view — populate with registered user's profile info
          const resolvedName =
            user?.onboardingBusinessName?.trim() ||
            user?.name?.trim() ||
            user?.username?.trim() ||
            "Register Your Business";

          const resolvedAddress =
            user?.location?.trim() || user?.city?.trim() || "Get listed on STRON Business";

          const resolvedServices = [
            ...(Array.isArray(user?.onboardingBusinessOffers) ? user.onboardingBusinessOffers : []),
            ...(Array.isArray(user?.onboardingBusinessFeatures)
              ? user.onboardingBusinessFeatures
              : []),
          ];

          const resolvedPhone = user?.contactNo || null;
          const isPhoneVerified = Boolean(
            user?.phoneVerified || (resolvedPhone && resolvedPhone.replace(/\D/g, "").length >= 10),
          );

          const userViewData: BusinessPlanData = {
            ...DEFAULT_GUEST_DATA,
            role: "user",
            isGymOwner: false,
            gymProfile: {
              ...DEFAULT_GUEST_DATA.gymProfile,
              name: resolvedName,
              businessName: resolvedName,
              address: resolvedAddress,
              location: user?.location || user?.city || undefined,
              phone: resolvedPhone,
              phoneVerified: isPhoneVerified,
              logoUrl: user?.profileImageUrl || null,
              tags: resolvedServices,
              services: resolvedServices,
            },
          };

          setData(userViewData);
          dispatch(setBusinessPlanData(userViewData));
          return;
        }

        // 3. User has a registered gym business
        const profile = businessRes.data;
        dispatch(setGymProfile(profile));

        // Fetch parallel dashboard data
        const [
          validityRes,
          revenueRes,
          couponsRes,
          proRes,
          payoutRes,
          plansRes,
          listingAnalyticsRes,
          myActivityRes,
          myOrganizerEventsRes,
          rcHasProRes,
        ] = await Promise.allSettled([
          dispatch(fetchMemberValiditySummaryThunk()).unwrap(),
          dispatch(fetchRevenueAnalyticsThunk()).unwrap(),
          dispatch(fetchBusinessCouponsThunk()).unwrap(),
          dispatch(fetchProSubscriptionThunk()).unwrap(),
          dispatch(fetchPayoutAccountThunk()).unwrap(),
          dispatch(fetchBusinessMembershipPlansThunk()).unwrap(),
          dispatch(fetchListingAnalyticsThunk()).unwrap(),
          dispatch(fetchMyActivity()).unwrap(),
          dispatch(fetchMyOrganizerEvents()).unwrap(),
          dispatch(checkEntitlementAccessThunk()).unwrap(),
        ]);

        let proData =
          reduxProSubRef.current ||
          (proRes.status === "fulfilled" && proRes.value.success ? proRes.value.data : null);
        const hasRcPro = rcHasProRes.status === "fulfilled" && rcHasProRes.value === true;
        if (hasRcPro && !proData?.isPro) {
          const syncRes = await dispatch(syncRevenueCatThunk()).unwrap().catch(() => null);
          if (syncRes?.success && syncRes.data) {
            proData = syncRes.data;
          }
        }
        const isProActive = isLiveProSubscription(proData);
        if (proData) {
          dispatch(setProSubscription(proData));
        }

        const role: BusinessPlanUserRole = isProActive ? "owner_pro" : "owner_free";

        // Parse Payout Account
        let payoutAccount: PayoutAccountSummary | undefined;
        let rawPayoutData: any = null;
        if (payoutRes.status === "fulfilled" && payoutRes.value.success && payoutRes.value.data) {
          rawPayoutData = payoutRes.value.data;
          payoutAccount = {
            isConfigured: Boolean(rawPayoutData.maskedAccountNumber || rawPayoutData.accountNumber),
            bankName: rawPayoutData.bankName || "Bank Account",
            maskedAccountNumber:
              rawPayoutData.maskedAccountNumber ||
              (rawPayoutData.accountNumber ? `••••${rawPayoutData.accountNumber.slice(-4)}` : null),
            verificationStatus: rawPayoutData.verificationStatus || "PENDING",
          };
        }

        // Parse Operating Hours
        let openingWeeklyHours = [];
        if (Array.isArray(profile.openingHours) && profile.openingHours.length > 0) {
          openingWeeklyHours = profile.openingHours;
        }

        // Calculate completion
        const verificationProgress = calculateGymProfileCompletion(
          {
            ...profile,
            address: profile.location || profile.address || "",
            logoUrl: profile.logo || profile.logoUrl,
            tags: profile.services || profile.tags || [],
            phone: profile.phone || user?.contactNo || null,
            operatingHours: {
              weeklyHours: openingWeeklyHours,
            },
          } as GymBusinessProfile,
          payoutAccount || rawPayoutData,
        );

        const resolvedOwnerServices =
          Array.isArray(profile.services) && profile.services.length > 0
            ? profile.services
            : Array.isArray(profile.tags) && profile.tags.length > 0
              ? profile.tags
              : [
                ...(Array.isArray(user?.onboardingBusinessOffers)
                  ? user.onboardingBusinessOffers
                  : []),
                ...(Array.isArray(user?.onboardingBusinessFeatures)
                  ? user.onboardingBusinessFeatures
                  : []),
              ];

        const gymProfile: GymBusinessProfile = {
          id: profile._id || profile.id,
          name:
            profile.businessName ||
            profile.name ||
            user?.onboardingBusinessName ||
            user?.name ||
            user?.username ||
            "Your Gym",
          businessName:
            profile.businessName ||
            profile.name ||
            user?.onboardingBusinessName ||
            user?.name ||
            user?.username,
          address:
            profile.location || profile.address || user?.location || user?.city || "Add location",
          location: profile.location || user?.location || user?.city || undefined,
          phone: profile.phone || user?.contactNo || null,
          phoneVerified: Boolean(user?.phoneVerified || profile.phone),
          logoUrl: profile.logo || profile.logoUrl || user?.profileImageUrl || null,
          bannerUrl: profile.bannerUrl || null,
          tags: resolvedOwnerServices,
          services: resolvedOwnerServices,
          mapLink: profile.mapLink || null,
          operatingHours: {
            todayStatus: openingWeeklyHours.length > 0 ? "Open Today" : undefined,
            weeklyHours: openingWeeklyHours,
          },
          isVerified: verificationProgress >= 100,
          verificationProgress,
          payoutVerificationStatus: rawPayoutData?.verificationStatus || null,
          payoutSlaText: "Direct settlement in 24h",
          status: profile.status || "ACTIVE",
        };

        // Parse Revenue & Fee
        const revData =
          revenueRes.status === "fulfilled" && revenueRes.value.success
            ? revenueRes.value.data
            : null;
        const totalRevenue = typeof revData?.totalEarnings === "number" ? revData.totalEarnings : 0;

        const earnings: EarningsSummary = {
          monthlyRevenue: totalRevenue,
          formattedRevenue: formatINR(totalRevenue),
          platformFeePercent: 5,
          savedAmount: 0,
          formattedSavedAmount: "₹0",
          isPro: isProActive,
          proRenewsOn: proData?.currentPeriodEnd,
          proFeaturesSummary: isProActive
            ? "All PRO Features Active"
            : "Upgrade for WhatsApp tools",
        };

        // Parse Plans
        const plansList =
          plansRes.status === "fulfilled" &&
            plansRes.value.success &&
            Array.isArray(plansRes.value.data)
            ? plansRes.value.data
            : [];
        const hasActivePlans = plansList.some((p: any) => p.status === "ACTIVE" || !p.status);

        // Parse Member Validity
        const valData =
          validityRes.status === "fulfilled" && validityRes.value.success
            ? validityRes.value.data
            : null;
        const memberValidity: MemberValidityMetrics = {
          totalMembers: valData?.totalMembers ?? 0,
          newLeads: valData?.newLeads ?? 0,
          expired: valData?.expired ?? 0,
          aboutToExpire: valData?.aboutToExpire ?? 0,
          moreThanWeekLeft:
            valData?.moreThanWeekLeft ??
            Math.max(
              0,
              (valData?.totalMembers ?? 0) -
              (valData?.expired ?? 0) -
              (valData?.aboutToExpire ?? 0),
            ),
          hasPlans: hasActivePlans,
          activePlansCount: plansList.filter((p: any) => p.status === "ACTIVE").length,
        };

        // Parse Event Listings & Event Customers (Events, NOT Gym Plans)
        const INACTIVE_LISTING_STATUSES = new Set([
          "draft",
          "completed",
          "closed",
          "ended",
          "cancelled",
          "settled",
        ]);
        const isActiveListingStatus = (status?: string | null) => {
          const normalized = String(status || "").trim().toLowerCase();
          if (!normalized) return true;
          return !INACTIVE_LISTING_STATUSES.has(normalized);
        };

        type ListingSource = {
          key: string;
          status?: string | null;
          registrationCount: number;
        };
        const listingMap = new Map<string, ListingSource>();
        const upsertListing = (listing: ListingSource) => {
          if (!listing.key) return;
          const existing = listingMap.get(listing.key);
          if (!existing) {
            listingMap.set(listing.key, listing);
            return;
          }
          const existingActive = isActiveListingStatus(existing.status);
          const incomingActive = isActiveListingStatus(listing.status);
          listingMap.set(listing.key, {
            key: listing.key,
            status:
              existingActive && !incomingActive
                ? existing.status
                : listing.status || existing.status,
            registrationCount: Math.max(existing.registrationCount, listing.registrationCount),
          });
        };

        const activities =
          myActivityRes.status === "fulfilled" && Array.isArray(myActivityRes.value)
            ? myActivityRes.value
            : [];

        activities
          .filter(
            (a) =>
              a.role === "organizer" || a.organizerUid === user?.uid || a.creatorUid === user?.uid,
          )
          .forEach((event) => {
            upsertListing({
              key: String(event.eventKey || event.id || ""),
              status: event.eventStatus,
              registrationCount: event.registrationCount || event.iconCount || 0,
            });
          });

        if (
          myOrganizerEventsRes.status === "fulfilled" &&
          Array.isArray(myOrganizerEventsRes.value)
        ) {
          myOrganizerEventsRes.value.forEach((event) => {
            upsertListing({
              key: String(event.key || ""),
              status: event.status,
              registrationCount: event.registrationCount || 0,
            });
          });
        }

        const allListings = Array.from(listingMap.values());
        const activeListings = allListings.filter((listing) => isActiveListingStatus(listing.status));
        const activeListingCount = activeListings.length;
        const totalListingsCount = allListings.length;
        const totalEventCustomers = allListings.reduce(
          (sum, listing) => sum + listing.registrationCount,
          0,
        );
        const activeEventCustomers = activeListings.reduce(
          (sum, listing) => sum + listing.registrationCount,
          0,
        );
        const activeEventKey = activeListings[0]?.key || allListings[0]?.key;

        const listingAnalyticsData =
          listingAnalyticsRes.status === "fulfilled" && listingAnalyticsRes.value.success
            ? listingAnalyticsRes.value.data
            : null;

        const backendConvRate = listingAnalyticsData?.conversionRate?.overallRate;
        const resolvedConversionRate =
          typeof backendConvRate === "number" && !isNaN(backendConvRate)
            ? Math.round(backendConvRate)
            : 0;

        const backendRepeatRate = listingAnalyticsData?.repeatUserRate?.overallRate;
        const resolvedRepeatRate =
          typeof backendRepeatRate === "number" && !isNaN(backendRepeatRate)
            ? Math.round(backendRepeatRate)
            : 0;

        const analyticsCustomers =
          listingAnalyticsData?.repeatUserRate?.totalParticipants ??
          listingAnalyticsData?.conversionRate?.totalTicketsSold ??
          0;
        const resolvedTotalCustomers =
          totalEventCustomers > 0 ? totalEventCustomers : analyticsCustomers;
        const resolvedActiveCustomers =
          activeEventCustomers > 0
            ? activeEventCustomers
            : totalEventCustomers > 0
              ? totalEventCustomers
              : analyticsCustomers;

        const listingCustomers: ListingCustomerMetrics = {
          totalCustomers: resolvedTotalCustomers,
          activeCustomers: resolvedActiveCustomers,
          activeListing: activeListingCount,
          totalListings: totalListingsCount,
          conversionRate: resolvedConversionRate,
          repeatUserRate: resolvedRepeatRate,
          activeEventKey,
        };

        // Parse Coupons
        const couponsList =
          couponsRes.status === "fulfilled" &&
            couponsRes.value.success &&
            Array.isArray(couponsRes.value.data)
            ? couponsRes.value.data
            : [];
        const coupons: CouponSummary = {
          activeCount: couponsList.filter((c: any) => c.status === "ACTIVE" || !c.status).length,
        };

        const resolvedData: BusinessPlanData = {
          role,
          isGymOwner: true,
          hasPro: isProActive,
          earnings,
          gymProfile,
          payoutAccount,
          memberValidity,
          listingCustomers,
          coupons,
        };

        setData(resolvedData);
        dispatch(setBusinessPlanData(resolvedData));
      } catch (err: any) {
        logError("[useBusinessPlanData] Fetch error:", err);
        const msg = err?.message || "Failed to load business plan details.";
        setError(msg);
        dispatch(setGymBusinessError(msg));
      } finally {
        inFlightRef.current = false;
        lastFetchedAtRef.current = Date.now();
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [dispatch, isAuthenticated, user],
  );

  useEffect(() => {
    fetchBusinessPlanData();
  }, [fetchBusinessPlanData]);

  const refresh = useCallback(() => fetchBusinessPlanData(true), [fetchBusinessPlanData]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    isGuest,
    isAuthenticated,
    refresh,
  };
};

export default useBusinessPlanData;
