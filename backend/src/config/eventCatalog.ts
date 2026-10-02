export const STEPS_PER_KM = 1250;

export const EVENT_KEYS = {
  SURVIVOR: "survivor",
  STEP_CHALLENGE: "step_challenge",
  MARATHON: "marathon",
  MARATHON_PHYSICAL: "marathon_physical",
} as const;

export type EventKey = (typeof EVENT_KEYS)[keyof typeof EVENT_KEYS];

export type StepChallengePlan = {
  id: string;
  label: string;
  price: number;
  dailyStepTarget: number;
  durationDays: number;
};

export type MarathonPlan = {
  id: string;
  label: string;
  price: number;
  distanceKm: number;
};

export type EventDefinition = {
  _id: string;
  key: EventKey | string;
  title: string;
  subtitle: string;
  type: string;
  price: number | null;
  billingLabel: string | null;
  requiresWarriorPass: boolean;
  hasLeaderboard: boolean;
  color: string;
  heroAsset: string;
  description: string;
  rules: string[];
  reward?: string;
  plans?: StepChallengePlan[] | MarathonPlan[];
  createdByUid?: string | null;
  rewardType?: string;
  eventType?: string;
  customMeta?: Record<string, unknown>;
  updatedAt?: string;
};

export type BuildMarathonPhysicalEventInput = {
  key?: string;
  uid?: string;
  title?: string;
  description?: string;
  distanceKm?: number;
  price?: number;
  rewardType?: string;
  rewards?: unknown[];
  distances?: unknown[];
  locationType?: string;
  location?: string;
  eventUrl?: string;
  enrollmentStartDate?: string | Date | null;
  enrollmentEndDate?: string | Date | null;
  eventDate?: string | Date | null;
  bannerName?: string;
  duration?: string | number | null;
  coupons?: unknown;
  plans?: MarathonPlan[];
  paymentMethod?: string;
  isRedirected?: boolean;
  redirectedUrl?: string | null;
};

export const EVENT_CATALOG: EventDefinition[] = [
  {
    _id: "survivor_event",
    key: EVENT_KEYS.SURVIVOR,
    title: "Survivor Challenge",
    subtitle: "Mr Beast style monthly survival simulation",
    type: "leaderboard",
    price: 999,
    billingLabel: "999/month",
    requiresWarriorPass: true,
    hasLeaderboard: true,
    color: "#A528FF",
    heroAsset: "survivor",
    description:
      "Hosted every month from the 1st to the 28th. Every 7 days, half the participants are eliminated and surviving steps reset to zero.",
    rules: [
      "Only Warrior Pass subscribers can enter.",
      "Auto-enrolment happens on month start for active subscribers.",
      "Joining mid-month places the user into the current active week.",
      "50% of participants are eliminated every 7 days.",
      "Survivors restart the next cycle with zero steps.",
    ],
    reward: "Monthly mystery box rewards for survivors and final winners.",
  },
  {
    _id: "step_challenge_event",
    key: EVENT_KEYS.STEP_CHALLENGE,
    title: "Step Challenge",
    subtitle: "Consistency test with no leaderboard",
    type: "solo",
    price: null,
    billingLabel: null,
    requiresWarriorPass: false,
    hasLeaderboard: false,
    color: "#277DFF",
    heroAsset: "step_challenge",
    description:
      "Join anytime. Finish within 90 days of enrolment by completing the selected daily step target.",
    rules: [
      "Solo event with no leaderboard.",
      "Pick one plan and make the one-time payment.",
      "Finishes 90 days from enrolment.",
      "Daily progress is counted from the end-of-day sync.",
    ],
    plans: [
      {
        id: "step_5k_7d",
        label: "Walk 5k steps/day for 7 days",
        price: 99,
        dailyStepTarget: 5000,
        durationDays: 7,
      },
      {
        id: "step_10k_7d",
        label: "Walk 10k steps/day for 7 days",
        price: 199,
        dailyStepTarget: 10000,
        durationDays: 7,
      },
      {
        id: "step_5k_30d",
        label: "Walk 5k steps/day for 30 days",
        price: 299,
        dailyStepTarget: 5000,
        durationDays: 30,
      },
      {
        id: "step_10k_30d",
        label: "Walk 10k steps/day for 30 days",
        price: 399,
        dailyStepTarget: 10000,
        durationDays: 30,
      },
    ],
  },
  {
    _id: "marathon_event",
    key: EVENT_KEYS.MARATHON,
    title: "Marathon (Virtual)",
    subtitle: "Long run practice and social capital",
    type: "leaderboard",
    price: null,
    billingLabel: null,
    requiresWarriorPass: false,
    hasLeaderboard: true,
    color: "#06998A",
    heroAsset: "marathon",
    description:
      "Join anytime. The leaderboard records distance till month-end and rewards every participant who completes the distance.",
    rules: [
      "Leaderboard stays open until the last date of the month.",
      "Users can select a distance tier before paying.",
      "Distance is tracked from accumulated step syncs.",
      "All users who complete the distance receive the reward.",
    ],
    plans: [
      {
        id: "marathon_40m",
        label: "40 m",
        price: 199,
        distanceKm: 0.04,
      },
      {
        id: "marathon_5km",
        label: "5 km",
        price: 299,
        distanceKm: 5,
      },
      {
        id: "marathon_10kms",
        label: "10 km",
        price: 499,
        distanceKm: 10,
      },
      {
        id: "marathon_21kms",
        label: "21 km",
        price: 999,
        distanceKm: 21,
      },
      {
        id: "marathon_42kms",
        label: "42 km",
        price: 1999,
        distanceKm: 42,
      },
    ],
  },
];

export const getEventDefinition = (eventKey: string): EventDefinition | null =>
  EVENT_CATALOG.find((event) => event.key === eventKey) ?? null;

export const buildMarathonPhysicalEvent = ({
  key = EVENT_KEYS.MARATHON_PHYSICAL,
  uid,
  title,
  description,
  distanceKm,
  price,
  rewardType,
  rewards,
  distances,
  locationType,
  location,
  eventUrl,
  enrollmentStartDate,
  enrollmentEndDate,
  eventDate,
  bannerName,
  duration,
  coupons,
  plans,
  paymentMethod,
  isRedirected,
  redirectedUrl,
}: BuildMarathonPhysicalEventInput): EventDefinition => {
  const baseMarathon = getEventDefinition(EVENT_KEYS.MARATHON);

  const normalizedDistance = Number(distanceKm) || 5;
  const normalizedPrice = Number(price) || 0;
  const normalizedTitle =
    title?.toString().trim() || `Marathon Physical (${normalizedDistance}km)`;
  const normalizedReward =
    rewardType?.toString().trim() || "Digital certificate";
  const normalizedDescription =
    description?.toString().trim() ||
    "Physical marathon event created from the app. Join and complete the target distance.";

  const normalizedRewards = Array.isArray(rewards)
    ? rewards.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];

  const normalizedDistances = Array.isArray(distances)
    ? distances.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];

  return {
    _id: baseMarathon?._id ?? `marathon_physical_${key}`,
    ...(baseMarathon ?? {}),
    key,
    title: normalizedTitle,
    subtitle: "User-created physical marathon",
    type: "leaderboard",
    price: normalizedPrice,
    billingLabel: `INR ${normalizedPrice}`,
    requiresWarriorPass: false,
    hasLeaderboard: true,
    color: baseMarathon?.color ?? "#06998A",
    heroAsset: baseMarathon?.heroAsset ?? "marathon",
    description: normalizedDescription,
    rules: [
      "Physical marathon entry created by user.",
      `Distance target: ${normalizedDistance} km.`,
      `Reward: ${normalizedReward}.`,
      "Leaderboard remains open till month-end.",
    ],
    plans:
      Array.isArray(plans) && plans.length > 0
        ? plans
        : [
            {
              id: `km_${normalizedDistance}_physical`,
              label: `${normalizedDistance} km (Physical)`,
              price: normalizedPrice,
              distanceKm: normalizedDistance,
            },
          ],
    createdByUid: uid ?? null,
    rewardType: normalizedReward,
    eventType: "marathon-physical",
    customMeta: {
      locationType: locationType?.toString().trim() || "Virtual",
      location: location?.toString().trim() || "Virtual",
      eventUrl: eventUrl?.toString().trim() || null,
      enrollmentStartDate: enrollmentStartDate ?? null,
      enrollmentEndDate: enrollmentEndDate ?? null,
      eventDate: eventDate ?? null,
      rewards: normalizedRewards,
      distances: normalizedDistances,
      bannerName: bannerName?.toString().trim() || null,
      duration: duration ?? null,
      coupons: coupons ?? null,
      paymentMethod: paymentMethod || (isRedirected ? "Redirected" : "Stron"),
      isRedirected: isRedirected ?? false,
      redirectedUrl: redirectedUrl ?? null,
    },
    updatedAt: new Date().toISOString(),
  };
};
