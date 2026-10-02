export interface EventPlan {
  id: string;
  name: string;
  label?: string;
  price?: number;
  distanceKm?: number;
  includes?: string[];
}

export interface EventEnrollment {
  uid: string;
  eventKey: string;
  status?: string;
  planId?: string;
  planLabel?: string;
  paymentAmount?: number;
  paymentStatus?: string;
  qualifiedDays?: number;
  targetDays?: number;
  targetStepsPerDay?: number;
  currentCycleSteps?: number;
  leaderboardSteps?: number;
  enrollmentStartTodaySteps?: number;
  distanceKm?: number;
  rewardEligible?: boolean;
  rewardClaimedAt?: string;
  bibNumber?: string;
  username?: string;
  enrolledAt?: string;
  expiresAt?: string;
  completedAt?: string;
  eliminatedAt?: string;
  cancelledAt?: string;
  updatedAt?: string;
}

export interface EventCatalogItem {
  key: string;
  title?: string;
  description?: string;
  eventType?: string;
  updatedAt?: string;
  tryFreeEligible?: boolean;
  marathonPaidAllowed?: boolean;
  activeEnrollment?: EventEnrollment | null;
  plans?: EventPlan[];
  customMeta?: Record<string, unknown>;
}

const parseEnrollmentDate = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const seconds = (value as Record<string, unknown>).seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000).toISOString();
    }
  }
  return String(value);
};

export const parseEventEnrollment = (json: Record<string, unknown>): EventEnrollment => ({
  uid: String(json.uid ?? ""),
  eventKey: String(json.eventKey ?? ""),
  status: json.status ? String(json.status) : undefined,
  planId: json.planId ? String(json.planId) : undefined,
  planLabel: json.planLabel ? String(json.planLabel) : undefined,
  paymentAmount: json.paymentAmount != null ? Number(json.paymentAmount) : undefined,
  paymentStatus: json.paymentStatus ? String(json.paymentStatus) : undefined,
  qualifiedDays: json.qualifiedDays != null ? Number(json.qualifiedDays) : undefined,
  targetDays: json.targetDays != null ? Number(json.targetDays) : undefined,
  targetStepsPerDay: json.targetStepsPerDay != null ? Number(json.targetStepsPerDay) : undefined,
  currentCycleSteps: json.currentCycleSteps != null ? Number(json.currentCycleSteps) : undefined,
  leaderboardSteps: json.leaderboardSteps != null ? Number(json.leaderboardSteps) : undefined,
  enrollmentStartTodaySteps:
    json.enrollmentStartTodaySteps != null ? Number(json.enrollmentStartTodaySteps) : undefined,
  distanceKm: json.distanceKm != null ? Number(json.distanceKm) : undefined,
  rewardEligible: json.rewardEligible === true,
  rewardClaimedAt: json.rewardClaimedAt ? String(json.rewardClaimedAt) : undefined,
  bibNumber: json.bibNumber ? String(json.bibNumber) : undefined,
  username: json.username ? String(json.username) : undefined,
  enrolledAt: parseEnrollmentDate(json.enrolledAt),
  expiresAt: parseEnrollmentDate(json.expiresAt),
  completedAt: parseEnrollmentDate(json.completedAt),
  eliminatedAt: parseEnrollmentDate(json.eliminatedAt),
  cancelledAt: parseEnrollmentDate(json.cancelledAt),
  updatedAt: parseEnrollmentDate(json.updatedAt),
});

export const parseEventCatalogItem = (json: Record<string, unknown>): EventCatalogItem => ({
  key: String(json.key ?? ""),
  title: json.title ? String(json.title) : undefined,
  description: json.description ? String(json.description) : undefined,
  eventType: json.eventType ? String(json.eventType) : undefined,
  updatedAt: json.updatedAt ? String(json.updatedAt) : undefined,
  tryFreeEligible: json.tryFreeEligible === true,
  marathonPaidAllowed: json.marathonPaidAllowed !== false,
  activeEnrollment:
    json.activeEnrollment && typeof json.activeEnrollment === "object"
      ? parseEventEnrollment(json.activeEnrollment as Record<string, unknown>)
      : null,
  plans: Array.isArray(json.plans)
    ? json.plans.map((p) => {
        const plan = p as Record<string, unknown>;
        const label = plan.label ? String(plan.label) : plan.name ? String(plan.name) : "";
        return {
          id: String(plan.id ?? plan._id ?? ""),
          name: label,
          label,
          price: plan.price != null ? Number(plan.price) : undefined,
          distanceKm: plan.distanceKm != null ? Number(plan.distanceKm) : undefined,
          includes: Array.isArray(plan.includes)
            ? plan.includes.map((item) => String(item))
            : undefined,
        };
      })
    : undefined,
  customMeta:
    json.customMeta && typeof json.customMeta === "object"
      ? (json.customMeta as Record<string, unknown>)
      : undefined,
});
