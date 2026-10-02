import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CreatePlanScreenContent } from "../components";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchBusinessProfileThunk,
  createBusinessProfileThunk,
  fetchPlanByIdThunk,
  createPlanThunk,
  updatePlanThunk,
  stopPlanThunk,
} from "../../model/gymBusiness.thunks";
import type { CreatePlanInput, UpdatePlanInput, MembershipPlan } from "@/types/gym";
import { href } from "@/navigation/href";
import { showToastMessage } from "@/utils/app-utils";
import { selectAuthUser } from "@/features/auth";

export const CreatePlanScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = params.planId;
  const user = useAppSelector(selectAuthUser);

  const [initialPlan, setInitialPlan] = useState<MembershipPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(Boolean(planId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [checkingBusiness, setCheckingBusiness] = useState(!planId);

  /**
   * Ensure a gym Business document exists for this owner.
   * Creates a minimal profile from onboarding data when missing.
   */
  const ensureBusinessProfile = useCallback(async (): Promise<boolean> => {
    const existing = await dispatch(fetchBusinessProfileThunk()).unwrap();
    if (existing.success && existing.data) {
      return true;
    }

    const businessName = user?.onboardingBusinessName?.trim() || user?.username?.trim() || "My Gym";

    const created = await dispatch(
      createBusinessProfileThunk({
        businessName,
        phone: user?.contactNo || null,
        location: user?.location || user?.city || null,
        services: [],
      }),
    ).unwrap();

    if (created.success && created.data) {
      return true;
    }

    // Conflict = already exists (race) — treat as OK
    if (created.code === "conflict" || created.message?.toLowerCase().includes("already exists")) {
      return true;
    }

    showToastMessage(
      created.message || "Please register your business profile before creating plans.",
    );
    router.replace(href.app.gymOnboarding as never);
    return false;
  }, [
    dispatch,
    router,
    user?.city,
    user?.contactNo,
    user?.location,
    user?.onboardingBusinessName,
    user?.username,
  ]);

  useEffect(() => {
    if (planId) {
      setCheckingBusiness(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setCheckingBusiness(true);
      const ok = await ensureBusinessProfile();
      if (!cancelled && !ok) {
        // navigation already handled
      }
      if (!cancelled) setCheckingBusiness(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [planId, ensureBusinessProfile]);

  const fetchPlanDetails = useCallback(async (id: string) => {
    setIsLoadingPlan(true);
    try {
      const res = await dispatch(fetchPlanByIdThunk(id)).unwrap();
      if (res.success && res.data) {
        setInitialPlan(res.data);
      } else {
        showToastMessage(res.message || "Failed to load plan details.");
      }
    } catch {
      showToastMessage("Could not load plan details.");
    } finally {
      setIsLoadingPlan(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (planId) {
      fetchPlanDetails(planId);
    }
  }, [planId, fetchPlanDetails]);

  const handleCreate = async (input: CreatePlanInput) => {
    setIsSubmitting(true);
    try {
      const ready = await ensureBusinessProfile();
      if (!ready) return;

      const response = await dispatch(createPlanThunk(input)).unwrap();
      if (response.success && response.data) {
        showToastMessage("Plan created successfully!");
        const plan = response.data;
        router.replace({
          pathname: href.app.planPublished,
          params: {
            planId: String(plan._id || plan.id || ""),
            planName: plan.name,
            price: String(plan.price || ""),
            duration: String(plan.duration || ""),
            durationUnit: plan.durationUnit || "MONTHS",
          },
        });
      } else if (response.code === "business_not_found") {
        showToastMessage("Please register your business profile before creating plans.");
        router.replace(href.app.gymOnboarding as never);
      } else {
        showToastMessage(response.message || "Failed to create plan");
      }
    } catch {
      showToastMessage("An unexpected error occurred while creating plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (input: UpdatePlanInput) => {
    if (!planId) return;
    setIsSubmitting(true);
    try {
      const response = await dispatch(updatePlanThunk({ planId, input })).unwrap();
      if (response.success && response.data) {
        showToastMessage("Plan updated successfully!");
        router.back();
      } else {
        showToastMessage(response.message || "Failed to update plan");
      }
    } catch {
      showToastMessage("An unexpected error occurred while updating plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle plan status (Stop / Continue)
  const handleTogglePlanStatus = async () => {
    if (!planId) return;
    const isCurrentlyStopped = initialPlan?.status === "STOPPED";
    setIsStopping(true);
    try {
      if (isCurrentlyStopped) {
        const response = await dispatch(
          updatePlanThunk({ planId, input: { status: "ACTIVE" } }),
        ).unwrap();
        if (response.success) {
          showToastMessage("Plan continued successfully!");
          router.back();
        } else {
          showToastMessage(response.message || "Failed to continue plan");
        }
      } else {
        const response = await dispatch(stopPlanThunk(planId)).unwrap();
        if (response.success) {
          showToastMessage("Plan stopped successfully.");
          router.back();
        } else {
          showToastMessage(response.message || "Failed to stop plan");
        }
      }
    } catch {
      showToastMessage("An unexpected error occurred.");
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <CreatePlanScreenContent
      initialPlan={initialPlan}
      isLoadingPlan={isLoadingPlan || checkingBusiness}
      isSubmitting={isSubmitting}
      isStopping={isStopping}
      onSubmit={handleCreate}
      onUpdate={handleUpdate}
      onStopPlan={handleTogglePlanStatus}
      onBack={() => router.back()}
    />
  );
};

export default CreatePlanScreen;
