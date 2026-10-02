import { log, logError } from "@/config/devLogger";
import { captureEvent } from "@/analytics/posthog/events";
import { getPublicShareBaseUrl } from "./shareBaseUrl";
import { shareMessageWithLink } from "./shareMessage";
import { showToastMessage } from "./app-utils";

export const listingShareBaseUrl = (): string => getPublicShareBaseUrl();

/** Public HTTPS business listing share URL (e.g. https://stron.in/listing/:id). */
export const buildListingShareUrl = (businessId: string): string => {
  const id = String(businessId || "").trim();
  return id ? `${getPublicShareBaseUrl()}/listing/${encodeURIComponent(id)}` : "";
};

/** Custom-scheme deep link for STRON app. */
export const buildListingDeepLink = (businessId: string): string => {
  const id = String(businessId || "").trim();
  return id ? `stron://listing/${encodeURIComponent(id)}` : "";
};

export interface ShareListingOptions {
  businessId: string;
  businessName?: string;
  location?: string;
  address?: string;
  services?: string[];
}

/** Share a gym business listing with a verified HTTPS smart-link. */
export const shareListing = async ({
  businessId,
  businessName = "Fitness Center",
  location,
  address,
  services,
}: ShareListingOptions): Promise<void> => {
  const id = String(businessId || "").trim();
  if (!id) {
    showToastMessage("Unable to share: business listing identifier is missing.");
    return;
  }

  const shareUrl = buildListingShareUrl(id);
  if (!shareUrl) {
    showToastMessage("Unable to generate share link.");
    return;
  }

  const name = businessName.trim() || "Fitness Center";
  const resolvedLocation = location?.trim() || address?.trim() || "";
  const locationText = resolvedLocation ? ` in ${resolvedLocation}` : "";
  const servicesText =
    Array.isArray(services) && services.length > 0
      ? `\nFacilities: ${services.slice(0, 4).join(" • ")}`
      : "";

  const message = `Check out "${name}"${locationText} on STRON! View membership plans, facilities, and activities.${servicesText}\n\nJoin here: ${shareUrl}`;

  try {
    const result = await shareMessageWithLink({ message, url: shareUrl, title: name });
    captureEvent("business_listing_shared", { business_id: id, business_name: name });
    log("[shareListing]", result);
  } catch (error) {
    logError("[shareListing] failed", error);
  }
};
