import { STRON_BACKEND_URL } from "@/constants/stron";

const rawApiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim();

/** Only send PostHog when a key is set and the API base URL includes `apiv2`. */
export const isPostHogEnabled =
  Boolean(rawApiKey) && STRON_BACKEND_URL.toLowerCase().includes("apiv2");

export const getPostHogApiKey = (): string | undefined => rawApiKey;
