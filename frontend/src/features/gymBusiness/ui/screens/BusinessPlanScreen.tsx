import React, { useCallback, useMemo, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { href } from "@/navigation/href";
import { BusinessPlanScreenContent, ManageProModal } from "../components";
import { useBusinessPlanData, useProSubscription } from "../hooks";
import { AuthModal } from "@/features/auth";
import { shareListing } from "@/utils/shareListing";
import { showToastMessage } from "@/utils/app-utils";

export const BusinessPlanScreen: React.FC = () => {
  const router = useRouter();
  const {
    data: rawData,
    isLoading,
    isRefreshing,
    isGuest,
    isAuthenticated,
    refresh,
  } = useBusinessPlanData();
  const {
    subscription,
    isPro: isProSub,
    isPaused,
    pause: pausePro,
    resume: resumePro,
    cancel: cancelPro,
    refresh: refreshPro,
    subscribe,
  } = useProSubscription();

  // Only trigger a fresh fetch on focus if data is not yet loaded.
  // Pull-to-refresh handles explicit user refreshes via onRefresh={refresh}.
  useFocusEffect(
    useCallback(() => {
      if (!rawData && !isLoading) {
        refresh();
      }
    }, [rawData, isLoading, refresh]),
  );

  const data = useMemo(() => {
    if (!rawData) return rawData;
    const effectivePro = Boolean(
      rawData.hasPro || rawData.earnings?.isPro || isProSub || subscription?.isPro,
    );
    return {
      ...rawData,
      hasPro: effectivePro,
      earnings: {
        ...rawData.earnings,
        isPro: effectivePro,
        platformFeePercent: 5,
        savedAmount: 0,
        formattedSavedAmount: "₹0",
        proFeaturesSummary: effectivePro
          ? "All PRO Features Active"
          : rawData.earnings.proFeaturesSummary,
      },
    };
  }, [rawData, isProSub, subscription?.isPro]);

  const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
  const [isManageProModalVisible, setIsManageProModalVisible] = useState(false);

  const handleEditProfile = useCallback(() => {
    if (!isAuthenticated || isGuest) {
      setIsAuthModalVisible(true);
      return;
    }
    if (data?.isGymOwner) {
      router.push(href.app.gymEditProfile as never);
    } else {
      router.push(href.app.gymOnboarding as never);
    }
  }, [data?.isGymOwner, isAuthenticated, isGuest, router]);

  const handleShareProfile = useCallback(async () => {
    const gym = data?.gymProfile;
    const businessId = gym?.id;
    if (!businessId) {
      showToastMessage("Business listing link is unavailable.");
      return;
    }
    await shareListing({
      businessId,
      businessName: gym.name || gym.businessName,
      address: gym.address || gym.location,
    });
  }, [data?.gymProfile]);

  const handleProBannerPress = useCallback(() => {
    const isOwnerPro = data?.earnings?.isPro || isProSub;
    if (isOwnerPro) {
      setIsManageProModalVisible(true);
    } else {
      void subscribe();
    }
  }, [data?.earnings?.isPro, isProSub, subscribe]);

  const handleListingsPress = useCallback(() => {
    router.push(href.app.listings as never);
  }, [router]);

  const handleManualPaymentsPress = useCallback(() => {
    router.push(href.app.manualPayments as never);
  }, [router]);

  const handlePlansPress = useCallback(() => {
    router.push(href.app.plans as never);
  }, [router]);

  const handleAddPlanPress = useCallback(() => {
    if (!isAuthenticated || isGuest) {
      setIsAuthModalVisible(true);
      return;
    }
    router.push(href.app.createPlan as never);
  }, [isAuthenticated, isGuest, router]);

  const handleAddListingPress = useCallback(() => {
    if (!isAuthenticated || isGuest) {
      setIsAuthModalVisible(true);
      return;
    }
    router.push({
      pathname: href.app.organizeCreate,
      params: { returnTo: "business" },
    } as never);
  }, [isAuthenticated, isGuest, router]);

  const handleMemberValidityPress = useCallback(
    (filterType?: string) => {
      router.push({
        pathname: href.app.gymMembers,
        params: filterType ? { filter: filterType } : undefined,
      });
    },
    [router],
  );

  const handleListingCustomersPress = useCallback(
    (filterType?: string) => {
      const activeKey = data?.listingCustomers?.activeEventKey;
      if (filterType === "conversion_rate") {
        router.push({
          pathname: href.app.listingAnalytics,
          params: { type: "conversion_rate" },
        });
      } else if (filterType === "repeat_rate") {
        router.push({
          pathname: href.app.listingAnalytics,
          params: { type: "repeat_rate" },
        });
      } else if (filterType === "active_customers") {
        router.push(href.app.activeCustomers as never);
      } else if (filterType === "active_listing") {
        router.push(href.app.listings as never);
      } else {
        if (activeKey) {
          router.push({
            pathname: href.app.eventDashboard,
            params: { key: activeKey },
          });
        } else {
          router.push(href.app.listings as never);
        }
      }
    },
    [router, data?.listingCustomers?.activeEventKey],
  );

  const handleManageCouponsPress = useCallback(() => {
    router.push(href.app.coupons as never);
  }, [router]);

  const handleAnalyticsPress = useCallback(
    (metric: "earnings" | "paying_users" | "peak_hours" | "attendance") => {
      const tabMap: Record<string, string> = {
        earnings: "earnings",
        paying_users: "active_members",
        peak_hours: "peak_hours",
        attendance: "attendance",
      };
      router.push({
        pathname: href.app.gymAnalytics,
        params: { tab: tabMap[metric] || "earnings" },
      });
    },
    [router],
  );

  const handlePayoutPress = useCallback(() => {
    router.push({
      pathname: href.app.gymPayout as never,
      params: {
        gymName: data?.gymProfile?.name || data?.gymProfile?.businessName || "Your Gym",
      },
    });
  }, [router, data?.gymProfile]);

  const handleFaqPress = useCallback(() => {
    router.push({
      pathname: href.app.policyWebView,
      params: { url: "https://stron.in/faq", title: "FAQs" },
    });
  }, [router]);

  const handleLoginPress = useCallback(() => {
    setIsAuthModalVisible(true);
  }, []);

  const handleRegisterGymPress = useCallback(() => {
    if (!isAuthenticated || isGuest) {
      setIsAuthModalVisible(true);
      return;
    }
    router.push(href.app.gymOnboarding as never);
  }, [isAuthenticated, isGuest, router]);

  return (
    <>
      <BusinessPlanScreenContent
        data={data}
        renewalDateText={
          subscription?.currentPeriodEnd ||
          (subscription as any)?.daysRemaining ||
          (subscription as any)?.renewalText
        }
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={refresh}
        onEditProfile={handleEditProfile}
        onShareProfile={handleShareProfile}
        onProBannerPress={handleProBannerPress}
        onListingsPress={handleListingsPress}
        onManualPaymentsPress={handleManualPaymentsPress}
        onPlansPress={handlePlansPress}
        onAddPlanPress={handleAddPlanPress}
        onAddListingPress={handleAddListingPress}
        onMemberValidityPress={handleMemberValidityPress}
        onListingCustomersPress={handleListingCustomersPress}
        onManageCouponsPress={handleManageCouponsPress}
        onAnalyticsPress={handleAnalyticsPress}
        onPayoutPress={handlePayoutPress}
        onFaqPress={handleFaqPress}
        onRegisterGymPress={handleRegisterGymPress}
        onLoginPress={handleLoginPress}
      />

      <ManageProModal
        visible={isManageProModalVisible}
        isPaused={isPaused}
        subscription={subscription}
        onClose={() => setIsManageProModalVisible(false)}
        onPause={async (days?: number) => {
          const ok = await pausePro(days ?? 0);
          if (ok) {
            refresh();
            refreshPro();
          }
        }}
        onResume={async () => {
          const ok = await resumePro();
          if (ok) {
            refresh();
            refreshPro();
          }
        }}
        onCancel={async () => {
          const ok = await cancelPro();
          if (ok) {
            refresh();
            refreshPro();
          }
        }}
      />

      <AuthModal
        visible={isAuthModalVisible}
        onClose={() => setIsAuthModalVisible(false)}
        onSuccess={() => {
          setIsAuthModalVisible(false);
          refresh();
        }}
      />
    </>
  );
};

export default BusinessPlanScreen;
