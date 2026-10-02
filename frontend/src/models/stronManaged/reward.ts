export type StronMedalTier = "gold" | "silver" | "bronze";

export type StronRewardType = "medal" | "certificate";

export type StronRewardStats = {
  kingTimeSeconds?: number | null;
  totalWins?: number | null;
  totalSteps?: number | null;
  successfulDays?: number | null;
  requiredDays?: number | null;
  distanceKm?: number | null;
  distanceTargetKm?: number | null;
  finishTimeSeconds?: number | null;
};

export type StronReward = {
  id: string;
  uid: string;
  eventKey: string;
  type: StronRewardType;
  medalTier: StronMedalTier | null;
  rank: number | null;
  format: string;
  eventTitle: string;
  venue: string | null;
  eventDate: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  stats: StronRewardStats;
  issuedAt: string | null;
};

export type StronRewardBadges = {
  gold: number;
  silver: number;
  bronze: number;
  bounceBack: number;
  closeCall: number;
  knockout: number;
};

export const parseStronReward = (raw: Record<string, unknown>): StronReward => {
  const statsRaw = (raw.stats || {}) as Record<string, unknown>;
  const asNum = (v: unknown) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const asStr = (v: unknown) => (v == null ? null : String(v));
  return {
    id: String(raw.id || raw._id || ""),
    uid: String(raw.uid || ""),
    eventKey: String(raw.eventKey || ""),
    type: String(raw.type || "certificate") as StronRewardType,
    medalTier: (asStr(raw.medalTier) as StronMedalTier | null) || null,
    rank: asNum(raw.rank),
    format: String(raw.format || ""),
    eventTitle: String(raw.eventTitle || "Event"),
    venue: asStr(raw.venue),
    eventDate: asStr(raw.eventDate),
    displayName: asStr(raw.displayName),
    avatarUrl: asStr(raw.avatarUrl),
    stats: {
      kingTimeSeconds: asNum(statsRaw.kingTimeSeconds),
      totalWins: asNum(statsRaw.totalWins),
      totalSteps: asNum(statsRaw.totalSteps),
      successfulDays: asNum(statsRaw.successfulDays),
      requiredDays: asNum(statsRaw.requiredDays),
      distanceKm: asNum(statsRaw.distanceKm),
      distanceTargetKm: asNum(statsRaw.distanceTargetKm),
      finishTimeSeconds: asNum(statsRaw.finishTimeSeconds),
    },
    issuedAt: asStr(raw.issuedAt),
  };
};

export interface StronMyRewardsResponse {
  success: boolean;
  rewards: Record<string, unknown>[];
  badges: StronRewardBadges;
}

export interface StronRewardPreviewsResponse {
  success: boolean;
  rewards: Record<string, unknown>[];
}
