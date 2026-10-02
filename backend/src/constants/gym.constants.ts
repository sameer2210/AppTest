export const PRO_FEATURES: readonly string[] = [
  "NO_PLATFORM_FEE",
  "ADVANCED_ANALYTICS",
  "WHATSAPP_REMINDERS",
  "UNLIMITED_LISTING",
  "ENHANCED_LISTING_VISIBILITY",
  "REFERRAL_COUPONS",
  "PRIORITY_SUPPORT",
];

export const FREE_FEATURES: readonly string[] = [
  "MEMBER_MANAGEMENT",
  "QR_ATTENDANCE",
  "BASIC_REPORTS",
];



export const GYM_NOTIFY_TAGS = {
  PURCHASE: "Gym Purchase",
  ACTIVATED: "Gym Plan Activated",
  RENEWED: "Gym Auto-renew",
  RENEW_FAILED: "Gym Auto-renew Failed",
  RENEW_OFF: "Gym Auto-renew Off",
  NEW_SALE: "Gym New Sale",
  OWNER_RENEW_FAILED: "Gym Renew Failed",
  STAFF_PROPOSAL: "Staff Proposal",
} as const;


export const TRIAL_CONVERT_WINDOW_MS = 48 * 60 * 60 * 1000;

export const LIVE_PRO_STATUSES: readonly string[] = ["ACTIVE", "TRIAL", "PAUSED"];

export const PLAN_LISTING_CATEGORIES = ["plan", "workshop", "class", "training"] as const;
export type PlanListingCategory = (typeof PLAN_LISTING_CATEGORIES)[number];

/** Public Brand Page category pills (matches Figma 2962:5506). */
export const BRAND_PAGE_CATEGORIES: readonly string[] = [
  "All",
  "Plans",
  "Events",
  "Workshop",
  "Classes",
];

export const WHATSAPP_REMINDER_TYPES = [
  "PAYMENT_RECEIPT",
  "AUTOPAY_FAILED",
  "MANUAL_PAYMENT",
] as const;

export const WHATSAPP_MESSAGE_STATUSES = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
] as const;

export type WhatsappReminderType = (typeof WHATSAPP_REMINDER_TYPES)[number];

export const WHATSAPP_REMINDER_DEFAULTS: Record<
  WhatsappReminderType,
  {
    dayOffsets: number[];
    audience: "ALL" | "QUEUE_TOP_N";
    audienceLimit: number | null;
    title: string;
    subtitle: string;
    targetLabel: string;
  }
> = {
  PAYMENT_RECEIPT: {
    dayOffsets: [0],
    audience: "ALL",
    audienceLimit: null,
    title: "Payment receipt",
    subtitle: "Send a WhatsApp receipt when a member pays.",
    targetLabel: "Everyone who pays",
  },
  AUTOPAY_FAILED: {
    dayOffsets: [0, 1, 3],
    audience: "ALL",
    audienceLimit: null,
    title: "Autopay failed",
    subtitle: "Remind members when auto-renew fails.",
    targetLabel: "Members with a failed autopay",
  },
  MANUAL_PAYMENT: {
    dayOffsets: [-3, -1, 0],
    audience: "ALL",
    audienceLimit: 42,
    title: "Manual payment reminder",
    subtitle: "Remind members before their plan is due.",
    targetLabel: "Everyone with a due payment",
  },
};

