import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { ListingsScreenContent } from "../components";
import { useAppDispatch } from "@/store/hooks";
import {
  fetchBusinessProfileThunk,
  listGymPlans,
  listMembersPreviewThunk,
} from "../../model/gymBusiness.thunks";
import type { MembershipPlan } from "@/types/gym";
import { href } from "@/navigation/href";
import { showToastMessage } from "@/utils/app-utils";
import { useProSubscription } from "../hooks/useProSubscription";

export const PlansScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasBusinessProfile, setHasBusinessProfile] = useState<boolean | null>(null);
  const { isPro, subscription, subscribe } = useProSubscription();

  const fetchPlans = useCallback(async () => {
    try {
      const profileRes = await dispatch(fetchBusinessProfileThunk()).unwrap();
      if (!profileRes.success && (profileRes as any).code === "business_not_found") {
        setHasBusinessProfile(false);
        setPlans([]);
        return;
      }
      setHasBusinessProfile(true);

      const [plansRes, membersRes] = await Promise.allSettled([
        dispatch(listGymPlans("ALL")).unwrap(),
        dispatch(listMembersPreviewThunk(100)).unwrap(),
      ]);

      let plansData: MembershipPlan[] = [];
      if (plansRes.status === "fulfilled" && plansRes.value.success && plansRes.value.data) {
        plansData = plansRes.value.data;
      }

      // Count active members per plan from members response as fallback
      const planCountMap = new Map<string, number>();
      if (membersRes.status === "fulfilled") {
        const rawMembers =
          membersRes.value.data?.members ||
          membersRes.value.data?.data ||
          membersRes.value.data ||
          [];

        if (Array.isArray(rawMembers)) {
          for (const m of rawMembers) {
            const planId =
              m.activeMembership?.planId?._id ||
              m.activeMembership?.planId ||
              m.membership?.planId?._id ||
              m.membership?.planId ||
              m.planId;
            const planName =
              m.activeMembership?.planId?.name || m.planName || m.membership?.planName;

            if (planId) {
              const key = String(planId);
              planCountMap.set(key, (planCountMap.get(key) || 0) + 1);
            }
            if (planName) {
              const nameKey = String(planName).toLowerCase().trim();
              planCountMap.set(nameKey, (planCountMap.get(nameKey) || 0) + 1);
            }
          }
        }
      }

      const enrichedPlans = plansData.map((plan) => {
        const directCount = plan.activeMembersCount ?? plan.totalSold;
        if (typeof directCount === "number" && directCount > 0) {
          return plan;
        }
        const countById = planCountMap.get(String(plan._id || plan.id || ""));
        const countByName = planCountMap.get(String(plan.name).toLowerCase().trim());
        const resolvedCount = countById ?? countByName ?? 0;
        return {
          ...plan,
          activeMembersCount: resolvedCount,
        };
      });

      setPlans(enrichedPlans);
    } catch {
      showToastMessage("Could not load plans.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useFocusEffect(
    useCallback(() => {
      fetchPlans();
    }, [fetchPlans]),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPlans();
  };

  const handleCreateNew = () => {
    if (hasBusinessProfile === false) {
      showToastMessage("Please register your business profile before creating plans.");
      router.push(href.app.gymOnboarding as never);
      return;
    }
    router.push(href.app.createPlan as never);
  };

  const handleManagePlan = (plan: MembershipPlan) => {
    router.push({
      pathname: href.app.createPlan,
      params: { planId: plan._id },
    });
  };

  const handlePlanPreview = (plan: MembershipPlan) => {
    router.push({
      pathname: href.app.planPreview as any,
      params: {
        planId: plan._id || plan.id,
        planName: plan.name,
        price: String(plan.price || ""),
        duration: String(plan.duration || ""),
        durationUnit: plan.durationUnit || "MONTHS",
      },
    });
  };

  const handleUpgradeToPro = () => {
    void subscribe();
  };

  const handleViewPlanMembers = (plan: MembershipPlan) => {
    router.push({
      pathname: href.app.gymMembers,
      params: { planId: plan._id, planName: plan.name },
    });
  };

  return (
    <ListingsScreenContent
      mode="plans"
      title="Plans"
      searchPlaceholder="Search my plans"
      plans={plans}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      isPro={isPro}
      renewalDateText={subscription?.currentPeriodEnd}
      onRefresh={handleRefresh}
      onCreateNewPress={handleCreateNew}
      onManagePlanPress={handleManagePlan}
      onPlanPreviewPress={handlePlanPreview}
      onUpgradeToPro={handleUpgradeToPro}
      onViewPlanMembers={handleViewPlanMembers}
      onBack={() => router.back()}
    />
  );
};

export default PlansScreen;
