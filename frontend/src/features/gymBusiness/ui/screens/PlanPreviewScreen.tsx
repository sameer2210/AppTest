import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { PlanPreviewScreenContent, type PlanPreviewBusinessData } from "../components/plans";
import { useAppDispatch } from "@/store/hooks";
import {
  fetchPlanByIdThunk,
  fetchBusinessProfileThunk,
  updatePlanThunk,
  stopPlanThunk,
} from "../../model/gymBusiness.thunks";
import type { MembershipPlan, PlanDurationUnit } from "@/types/gym/plan.types";
import { sharePlan } from "@/utils/sharePlan";
import { href } from "@/navigation/href";
import { showToastMessage } from "@/utils/app-utils";

export const PlanPreviewScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{
    planId?: string;
    planName?: string;
    price?: string;
    duration?: string;
    durationUnit?: string;
  }>();
  const planId = typeof params.planId === "string" ? params.planId : "";

  const initialPlan: MembershipPlan | null = params.planName
    ? {
        _id: planId,
        id: planId,
        name: params.planName,
        price: Number(params.price) || 0,
        currency: "INR",
        billingCycle: "MONTHLY",
        duration: Number(params.duration) || 1,
        durationUnit: (params.durationUnit as PlanDurationUnit) || "MONTHS",
        isFreeTrial: false,
        trialDuration: 0,
        perks: [],
        status: "ACTIVE",
      }
    : null;

  const [plan, setPlan] = useState<MembershipPlan | null>(initialPlan);
  const [business, setBusiness] = useState<PlanPreviewBusinessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const promises = [
        planId
          ? dispatch(fetchPlanByIdThunk(planId)).unwrap()
          : Promise.resolve({ success: false, data: undefined }),
        dispatch(fetchBusinessProfileThunk()).unwrap(),
      ];

      const [planRes, businessRes] = await Promise.allSettled(promises);

      if (planRes.status === "fulfilled" && (planRes.value as any)?.success && (planRes.value as any)?.data) {
        setPlan((planRes.value as any).data);
      }
      if (
        businessRes.status === "fulfilled" &&
        (businessRes.value as any)?.success &&
        (businessRes.value as any)?.data
      ) {
        const raw = (businessRes.value as any).data;
        const mappedBusiness: PlanPreviewBusinessData = {
          businessName: raw.name || raw.businessName || "",
          logo: raw.logoUrl || raw.logo || null,
          bannerUrl: raw.bannerUrl || null,
          location: raw.address || raw.location || null,
          mapLink: raw.mapLink || null,
          phone: raw.phone || null,
          email: raw.email || null,
          services: raw.tags || raw.services || [],
          openingHours: raw.operatingHours?.weeklyHours || raw.openingHours || [],
        };
        setBusiness(mappedBusiness);
      }
    } catch {
      showToastMessage("Could not load latest plan details.");
    } finally {
      setIsLoading(false);
    }
  }, [planId, dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShare = async () => {
    if (!plan) return;
    await sharePlan(plan);
  };

  const handleEdit = () => {
    const idToEdit = plan?._id || plan?.id || planId;
    if (idToEdit) {
      router.push({
        pathname: href.app.createPlan as any,
        params: { planId: idToEdit },
      });
    }
  };

  const handleTogglePlanStatus = async () => {
    const idToToggle = plan?._id || plan?.id || planId;
    if (!idToToggle) return;

    const isCurrentlyStopped = plan?.status === "STOPPED";
    setIsTogglingStatus(true);
    try {
      if (isCurrentlyStopped) {
        const res = await dispatch(
          updatePlanThunk({
            planId: idToToggle,
            input: { status: "ACTIVE" },
          }),
        ).unwrap();
        if (res.success && res.data) {
          setPlan(res.data);
          showToastMessage("Plan resumed successfully!");
        } else {
          showToastMessage(res.message || "Failed to resume plan");
        }
      } else {
        const res = await dispatch(stopPlanThunk(idToToggle)).unwrap();
        if (res.success) {
          setPlan((prev) => (prev ? { ...prev, status: "STOPPED" } : prev));
          showToastMessage("Plan stopped successfully.");
        } else {
          showToastMessage(res.message || "Failed to stop plan");
        }
      }
    } catch {
      showToastMessage("An error occurred while updating plan status.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <PlanPreviewScreenContent
      plan={plan}
      business={business}
      isLoading={isLoading}
      isTogglingStatus={isTogglingStatus}
      onBack={() => router.back()}
      onShare={handleShare}
      onEdit={handleEdit}
      onTogglePlanStatus={handleTogglePlanStatus}
    />
  );
};

export default PlanPreviewScreen;
