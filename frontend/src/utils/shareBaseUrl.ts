export const PUBLIC_STRON_HOST = "https://stron.in";

/**
 * Public HTTPS host for share links.
 * Never leak raw/internal API backend hosts (apiv2 / apidev).
 */
export const getPublicShareBaseUrl = (): string => {
  const configured = (
    process.env.EXPO_PUBLIC_SHARE_BASE_URL ||
    process.env.EXPO_PUBLIC_EVENT_SHARE_BASE_URL ||
    ""
  ).trim();

  if (configured) {
    if (configured.includes("apiv2.stron.in") || configured.includes("apidev.stron.in")) {
      return PUBLIC_STRON_HOST;
    }
    return configured.replace(/\/$/, "");
  }

  return PUBLIC_STRON_HOST;
};

export const getShareBaseUrl = (): string => getPublicShareBaseUrl();
