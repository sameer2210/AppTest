import type { AppDispatch } from "@/store";
import { uploadProfileImageThunk } from "@/features/core";
import { showToastMessage } from "@/utils/app-utils";
import { TOAST_PRESETS } from "@/utils/constants";

export const isHttpUrl = (value?: string | null): boolean => {
  const raw = String(value || "").trim();
  return /^https?:\/\//i.test(raw);
};

const isLocalImageUri = (value?: string | null): boolean => {
  const raw = String(value || "").trim();
  if (!raw || isHttpUrl(raw)) return false;
  // Bitmoji keys stay as-is (not uploaded as files)
  if (/^bt\d+$/i.test(raw)) return false;
  return (
    raw.startsWith("file://") ||
    raw.startsWith("content://") ||
    raw.startsWith("ph://") ||
    raw.startsWith("assets-library://") ||
    raw.startsWith("/")
  );
};

/**
 * Resolve business logo for API save:
 * - http(s) → keep
 * - local picker URI → upload to R2 first
 * - null / empty / bitmoji → null (API expects remote logo URL)
 */
export const resolveBusinessLogoForSave = async (
  dispatch: AppDispatch,
  logoUrl: string | null | undefined,
  publicIdPrefix = "business_logo",
): Promise<string | null> => {
  const raw = String(logoUrl || "").trim();
  if (!raw) return null;
  if (isHttpUrl(raw)) return raw;
  if (!isLocalImageUri(raw)) return null;

  showToastMessage("Uploading business logo...", TOAST_PRESETS.INFO);
  const uploaded = await dispatch(
    uploadProfileImageThunk({
      uri: raw,
      publicId: `${publicIdPrefix}_${Date.now()}`,
    }),
  ).unwrap();

  const url = String(uploaded || "").trim();
  return isHttpUrl(url) ? url : null;
};
