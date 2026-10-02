import React, { useState } from "react";
import { useRouter } from "expo-router";
import { GymProfileEditScreenContent, type OpeningHourEntry } from "../components";
import { useAppDispatch } from "@/store/hooks";
import {
  fetchBusinessProfileThunk,
  createBusinessProfileThunk,
  updateBusinessProfileThunk,
} from "../../model/gymBusiness.thunks";
import { updateGymProfileLocal } from "../../model/gymBusiness.slice";
import { useBusinessPlanData } from "../hooks";
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

export const GymEditProfileScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data, refresh } = useBusinessPlanData();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (updatedData: {
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
      const logo = await resolveBusinessLogoForSave(
        dispatch,
        updatedData.logoUrl,
        data?.gymProfile?.id || "business",
      );

      const payload = {
        businessName: updatedData.businessName?.trim() || "Register Your Business",
        phone: updatedData.phone || null,
        logo,
        location: updatedData.location?.trim() || null,
        mapLink: isHttpUrl(updatedData.mapLink) ? updatedData.mapLink.trim() : null,
        services: updatedData.services || [],
        openingHours: updatedData.openingHours.map((d) => ({
          day: d.dayKey,
          isAvailable: d.isAvailable,
          openTime: d.isAvailable ? d.openTime : null,
          closeTime: d.isAvailable ? d.closeTime : null,
        })),
      };

      // Upsert: create if profile does not exist yet, otherwise update
      const existing = await dispatch(fetchBusinessProfileThunk()).unwrap();
      const res =
        existing.success && existing.data
          ? await dispatch(updateBusinessProfileThunk(payload)).unwrap()
          : await dispatch(createBusinessProfileThunk(payload)).unwrap();

      if (res.success) {
        if (logo !== undefined) {
          dispatch(updateGymProfileLocal({ logo }));
        }
        showToastMessage(
          existing.success && existing.data
            ? "Business profile updated successfully!"
            : "Business registered successfully!",
          TOAST_PRESETS.SUCCESS,
        );
        refresh();
        router.back();
      } else {
        showToastMessage(res.message || "Failed to save profile.", TOAST_PRESETS.FAILURE);
      }
    } catch (error) {
      showToastMessage(
        messageFromUnknown(error, "Error updating business profile."),
        TOAST_PRESETS.FAILURE,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GymProfileEditScreenContent
      initialProfile={data?.gymProfile}
      submitButtonText="Save Changes"
      isSaving={isSaving}
      onSave={handleSave}
      onPaymentDetailsPress={() => router.push(href.app.gymPayout as never)}
      onDiscard={() => router.back()}
      onBack={() => router.back()}
    />
  );
};

export default GymEditProfileScreen;
