export type ConnectCheckInPlan = {
  id: string;
  businessId?: string;
  name: string;
  billingText: string;
  isBought?: boolean;
  isExpired?: boolean;
  price: string;
  originalPrice?: string;
  tags?: string[];
  actionText?:
    | "Check In"
    | "Upgrade"
    | "Choose Plan"
    | "Buy Plan"
    | "Check In to Activate"
    | "Start Free Trial"
    | "Pay to continue"
    | "Register";
  billingCycle?: string | null;
  membershipId?: string;
  autoRenew?: boolean;
  endDate?: string;
  isFreeTrial?: boolean;
  isServiceTag?: boolean;
  trialDuration?: number;
  statusText?: string;
};

export type ConnectCheckInEvent = {
  id: string;
  eventKey?: string;
  title: string;
  subtitle: string;
  locationDetails: string;
  isEnrolled?: boolean;
  isCheckedIn?: boolean;
  priceText?: string;
  format?: string;
  bannerName?: string | null;
};

export type ConnectCheckInCatalog = {
  scanId?: string;
  entityName: string;
  plans: ConnectCheckInPlan[];
  events: ConnectCheckInEvent[];
};

let pendingCatalog: ConnectCheckInCatalog | null = null;

/**
 * Handoff catalog from Connect scan → Check-In Selection.
 * Route params corrupt large/unicode JSON (e.g. ₹ prices), so we keep it in memory.
 */
export const ConnectCheckInCatalogStore = {
  set(catalog: ConnectCheckInCatalog) {
    pendingCatalog = {
      scanId: catalog.scanId,
      entityName: (catalog.entityName || "").trim() || "Check-in",
      plans: Array.isArray(catalog.plans) ? catalog.plans : [],
      events: Array.isArray(catalog.events) ? catalog.events : [],
    };
  },

  peek(): ConnectCheckInCatalog | null {
    return pendingCatalog;
  },

  /** Read once and clear so a later screen open cannot reuse stale listings. */
  take(): ConnectCheckInCatalog | null {
    const next = pendingCatalog;
    pendingCatalog = null;
    return next;
  },

  clear() {
    pendingCatalog = null;
  },
};
