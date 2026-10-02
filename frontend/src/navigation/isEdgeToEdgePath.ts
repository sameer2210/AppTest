const EDGE_TO_EDGE_PATH_SEGMENTS = [
  "/auth/login",
  "/auth/onboarding",
  "/explore",
  "/activity",
  "/event-details",
  "/face-off-details",
  "/stron-event",
  "/review-payment",
  "/payment-success",
  "/payment-failed",
  "/ongoing-battle",
  "/featured-events",
  "/search-results",
  "/create-marathon",
  "/create-step-challenge",
  "/create-king-of-the-hill",
  "/create-face-off",
  "/external-listing",
  "/event-published",
  "/event-dashboard",
  "/events",
  "/organize-create",
  "/organizer-preview",
  "/participant-detail",
  "/organize-leaderboard",
  "/event-rewards",
  "/profile",
  "/google-fit-stats",
  "/notifications",
  "/settings",
  "/policy-webview",
  "/step-race",
  "/ongoing-step-race",
  "/completed-step-race",
  "/my-races",
  "/connect-with-stron",
  "/check-in-selection",
  "/coupons",
  "/create-coupon",
  "/stron-pro",
  "/plan",
  "/listings",
  "/create-plan",
  "/plan-published",
  "/plan-preview",
  "/manual-payments",
  "/manual-payment-detail",
  "/gym-payout",
  "/gym-members",
  "/gym-edit-profile",
  "/gym-onboarding",
  "/gym-analytics",
  "/listing-analytics",
  "/my-plans",
  "/plan-detail",
  "/active-customers",
] as const;

const isHomePath = (pathname: string): boolean => pathname === "/" || pathname === "";

export const isEdgeToEdgePath = (pathname: string): boolean => {
  if (isHomePath(pathname)) return true;

  return EDGE_TO_EDGE_PATH_SEGMENTS.some((segment) => {
    if (segment === "/profile") {
      return pathname === "/profile" || pathname.endsWith("/profile");
    }
    return pathname.includes(segment);
  });
};
