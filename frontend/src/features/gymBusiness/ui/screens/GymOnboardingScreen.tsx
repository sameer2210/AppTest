import React, { useState } from "react";
import { useRouter } from "expo-router";
import { GymProfileEditScreenContent, type OpeningHourEntry } from "../components";
import { setGymProfile, updateGymProfileLocal } from "../../model/gymBusiness.slice";
import {
  createBusinessProfileThunk,
  updateBusinessProfileThunk,
} from "../../model/gymBusiness.thunks";
import { useBusinessPlanData } from "../hooks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { href } from "@/navigation/href";
import { showToastMessage } from "@/utils/app-utils";
import { TOAST_PRESETS } from "@/utils/constants";
import { isHttpUrl, resolveBusinessLogoForSave } from "../utils/resolveBusinessLogo";

const messageFromUnknown = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
};

export const GymOnboardingScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const { data, refresh } = useBusinessPlanData();
  const [isSaving, setIsSaving] = useState(false);

  const existingProfile = data?.gymProfile || null;
  const isExistingBusiness = Boolean(data?.isGymOwner);

  // Filter out placeholder names/addresses from existingProfile
  const hasRealName =
    existingProfile?.name &&
    existingProfile.name.toLowerCase() !== "register your business" &&
    existingProfile.name.toLowerCase() !== "register your gym";

  const hasRealAddress =
    existingProfile?.address &&
    existingProfile.address.toLowerCase() !== "get listed on stron business" &&
    existingProfile.address.toLowerCase() !== "add location";

  const resolvedName =
    (hasRealName ? existingProfile?.name : undefined) ||
    user?.onboardingBusinessName?.trim() ||
    user?.name?.trim() ||
    user?.username?.trim() ||
    "";

  const resolvedLocation =
    (hasRealAddress ? existingProfile?.address : undefined) ||
    user?.location?.trim() ||
    user?.city?.trim() ||
    "";

  const resolvedServices =
    (existingProfile?.services && existingProfile.services.length > 0
      ? existingProfile.services
      : undefined) ||
    (existingProfile?.tags && existingProfile.tags.length > 0 ? existingProfile.tags : undefined) ||
    (user?.onboardingBusinessOffers && user.onboardingBusinessOffers.length > 0
      ? user.onboardingBusinessOffers
      : undefined) ||
    (user?.onboardingBusinessFeatures && user.onboardingBusinessFeatures.length > 0
      ? user.onboardingBusinessFeatures
      : undefined) ||
    [];

  const resolvedLogo = existingProfile?.logoUrl || user?.profileImageUrl || null;

  const initialProfile = {
    ...existingProfile,
    name: resolvedName,
    businessName: resolvedName,
    address: resolvedLocation,
    location: resolvedLocation,
    phone: existingProfile?.phone || user?.contactNo || null,
    phoneVerified: Boolean(existingProfile?.phoneVerified || user?.phoneVerified),
    logoUrl: resolvedLogo,
    services: resolvedServices,
    tags: resolvedServices,
  } as Parameters<typeof GymProfileEditScreenContent>[0]["initialProfile"];

  const handleSave = async (submittedData: {
    businessName: string;
    phone?: string | null;
    logoUrl?: string | null;
    location: string;
    mapLink: string;
    services: string[];
    openingHours: OpeningHourEntry[];
  }) => {
    setIsSaving(true);
    try {
      const cleanMapLink = isHttpUrl(submittedData.mapLink) ? submittedData.mapLink.trim() : null;
      const cleanLogo = await resolveBusinessLogoForSave(
        dispatch,
        submittedData.logoUrl,
        existingProfile?.id || user?.uid || "business",
      );

      const payload = {
        businessName: submittedData.businessName?.trim() || "Register Your Business",
        phone: submittedData.phone || null,
        logo: cleanLogo,
        location: submittedData.location?.trim() || null,
        mapLink: cleanMapLink,
        services: submittedData.services || [],
        openingHours: submittedData.openingHours.map((d) => ({
          day: d.dayKey,
          isAvailable: d.isAvailable,
          openTime: d.isAvailable ? d.openTime : null,
          closeTime: d.isAvailable ? d.closeTime : null,
        })),
      };

      // Resume-safe: update if a business already exists, otherwise create.
      // Note: existingProfile is always a truthy placeholder stub (see
      // useBusinessPlanData's business_not_found branch) even for brand-new
      // users, so the create/update decision must key off isGymOwner instead.
      const res = isExistingBusiness
        ? await dispatch(updateBusinessProfileThunk(payload)).unwrap()
        : await dispatch(createBusinessProfileThunk(payload)).unwrap();

      if (res.success) {
        if (res.data) dispatch(setGymProfile(res.data));
        dispatch(updateGymProfileLocal({ logo: cleanLogo }));
        showToastMessage(
          "Changes saved. You can finish your profile anytime.",
          TOAST_PRESETS.SUCCESS,
        );
        refresh();
        router.replace(href.app.businessPlan as never);
      } else {
        showToastMessage(res.message || "Failed to save. Please try again.", TOAST_PRESETS.FAILURE);
      }
    } catch (error) {
      showToastMessage(
        messageFromUnknown(error, "Error saving business profile. Please try again."),
        TOAST_PRESETS.FAILURE,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GymProfileEditScreenContent
      mode="onboarding"
      title="Register Your Business"
      submitButtonText="Save Changes"
      initialProfile={initialProfile}
      isSaving={isSaving}
      onSave={handleSave}
      onPaymentDetailsPress={() => router.push(href.app.gymPayout as never)}
      onDiscard={() => router.back()}
      onBack={() => router.back()}
    />
  );
};

export default GymOnboardingScreen;
