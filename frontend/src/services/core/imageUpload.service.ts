import { Platform } from "react-native";
import { STRON_BACKEND_URL, UPLOAD_FOLDERS } from "@/constants/stron";
import { ensureValidAccessToken } from "./apiClient.service";
import { TokenStorage } from "../auth/tokenStorage.service";
import { normalizeRemoteImageUri } from "@/utils/resolveRemoteImageUri";

export const USER_FRIENDLY_UPLOAD_ERROR =
  "Couldn’t upload image. Check connection and try again.";

const normalizeUploadUri = (uri: string): string => {
  const trimmed = uri.trim();
  if (Platform.OS === "android") {
    if (!trimmed.startsWith("file://") && !trimmed.startsWith("content://")) {
      return `file://${trimmed}`;
    }
  }
  return trimmed;
};

const resolveMimeType = (uri: string): { type: string; name: string } => {
  const cleanUri = uri.split("?")[0] || "";
  const lastSegment = cleanUri.split("/").pop() || "";
  const parts = lastSegment.split(".");
  const rawExt = parts.length > 1 ? parts.pop()?.toLowerCase() : "";
  const ext = rawExt && /^[a-z0-9]{1,5}$/i.test(rawExt) ? rawExt : "jpg";

  let type = "image/jpeg";
  if (ext === "png") {
    type = "image/png";
  } else if (ext === "webp") {
    type = "image/webp";
  }

  return {
    type,
    name: `upload_${Date.now()}.${ext}`,
  };
};

const uploadViaR2 = async (
  uri: string,
  folder: string,
  publicId?: string,
): Promise<string> => {
  const trimmed = (uri || "").trim();
  if (!trimmed) {
    throw new Error(USER_FRIENDLY_UPLOAD_ERROR);
  }

  // Already a remote URL or Bitmoji identifier — skip re-upload.
  if (/^https?:\/\//i.test(trimmed) || /^bt\d+$/i.test(trimmed)) {
    return trimmed;
  }

  const normalizedUri = normalizeUploadUri(trimmed);
  const { type, name } = resolveMimeType(normalizedUri);

  const form = new FormData();
  form.append("folder", folder);
  if (publicId?.trim()) form.append("publicId", publicId.trim());
  form.append("file", {
    uri: normalizedUri,
    type,
    name,
  } as unknown as Blob);

  await ensureValidAccessToken().catch(() => false);
  const token = await TokenStorage.getAccessToken();

  const configured = (STRON_BACKEND_URL || "").trim().replace(/\/$/, "");
  // Keep upload on the same host as the rest of the API so the auth token matches.
  // Only remap broken apidev asset host → apiv2 when explicitly on apidev.
  const baseUrl =
    !configured
      ? "https://apiv2.stron.in"
      : configured.includes("apidev.stron.in")
        ? "https://apiv2.stron.in"
        : configured;
  const uploadUrl = `${baseUrl}/api/upload/image`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    // Do not set Content-Type — RN must attach the multipart boundary.
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const payload = (await response.json().catch(() => null)) as {
      success?: boolean;
      url?: string;
      data?: { url?: string; key?: string };
      message?: string;
      code?: string;
    } | null;

    if (!response.ok) {
      if (response.status === 503 || payload?.code === "STORAGE_NOT_CONFIGURED") {
        throw new Error(
          "Image upload service is currently unavailable. Please try again later.",
        );
      }
      const serverMsg =
        typeof payload?.message === "string" ? payload.message.trim() : "";
      throw new Error(serverMsg || USER_FRIENDLY_UPLOAD_ERROR);
    }

    // API returns { success, data: { url } }; accept legacy { url } too.
    const uploadedUrl =
      (typeof payload?.data?.url === "string" && payload.data.url) ||
      (typeof payload?.url === "string" && payload.url) ||
      "";

    if (!uploadedUrl) {
      throw new Error(USER_FRIENDLY_UPLOAD_ERROR);
    }

    return normalizeRemoteImageUri(uploadedUrl) || uploadedUrl;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.message.includes("unavailable")) {
      throw error;
    }
    throw new Error(USER_FRIENDLY_UPLOAD_ERROR);
  }
};

/** All app image uploads go through Cloudflare R2 via the Stron API. */
export const ImageUploadService = {
  uploadProfileImage: (uri: string, publicId?: string) => {
    return uploadViaR2(uri, UPLOAD_FOLDERS.profile, publicId);
  },

  uploadClanBanner: (uri: string, publicId?: string) => {
    return uploadViaR2(uri, UPLOAD_FOLDERS.clanBanner, publicId);
  },
};

/** @deprecated Use ImageUploadService — Cloudinary is no longer used. */
export const CloudinaryService = ImageUploadService;
