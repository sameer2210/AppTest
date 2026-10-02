import type { Request, Response } from "express";
import { routeParam } from "../../../types/controller.util.js";
import {
  buildStoreLinks,
  escapeHtml,
  renderShareHtmlPage,
} from "../../../utils/shareHtml.util.js";
import { getSharedListing } from "../services/listingShare.service.js";

const notFoundPage = () =>
  renderShareHtmlPage({
    title: "Business Not Found",
    subtitle: "The business listing link is invalid or has expired.",
    canonicalPath: "/listing",
    customScheme: "stron://home",
    referrerSource: "listing_share",
  });

/**
 * Public smart-link for shared business listings.
 * GET /listing/:id, /api/listing/:id, /business/:id, /api/business/:id
 */
export const openSharedListingPage = async (req: Request, res: Response) => {
  const listingId = routeParam(req.params.id);

  if (!listingId) {
    return res.status(404).type("html").send(notFoundPage());
  }

  let title = "STRON Business Listing";
  let subtitle = "Explore plans, facilities, and connect on STRON.";
  let extraDetails = "";

  try {
    const listing = await getSharedListing(listingId);
    if (listing) {
      const { business, plans } = listing;
      title = String(business.businessName || "STRON Partner Gym");
      subtitle = String(business.location || "Verified Fitness Center on STRON");

      const plansSummary =
        plans.length > 0
          ? `<div style="margin-top:8px;"><strong>Available Plans:</strong><ul style="margin:6px 0 0; padding-left:18px;">${plans
              .map(
                (plan) =>
                  `<li>${escapeHtml(plan.name)} - ₹${Number(plan.price).toLocaleString("en-IN")}</li>`,
              )
              .join("")}</ul></div>`
          : "";

      extraDetails = `
        <div style="font-weight:700; color:#FFFFFF; margin-bottom:4px;">${escapeHtml(business.businessName)}</div>
        <div style="color:rgba(255,255,255,0.7);">${escapeHtml(business.location || "Location on request")}</div>
        ${plansSummary}
      `;
    }
  } catch {
    // Fall back to the generic template when the lookup fails.
  }

  const customScheme = `stron://listing/${encodeURIComponent(listingId)}`;
  const canonicalPath = `/listing/${encodeURIComponent(listingId)}`;
  const { androidIntent } = buildStoreLinks({
    referrerSource: "listing_share",
    canonicalPath,
    customScheme,
  });

  const ua = String(req.headers["user-agent"] || "");
  if (/Android/i.test(ua)) {
    return res.redirect(302, androidIntent);
  }

  return res.status(200).type("html").send(
    renderShareHtmlPage({
      title,
      subtitle,
      canonicalPath,
      customScheme,
      referrerSource: "listing_share",
      extraDetails,
    }),
  );
};
