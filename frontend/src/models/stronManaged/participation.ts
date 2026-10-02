import type { StronEventFormat } from "./event";

export type StronParticipationStatus =
  "registered" | "active" | "completed" | "expired" | "eliminated" | "cancelled" | "refunded";

export type StronParticipation = {
  id: string;
  uid: string;
  eventKey: string;
  format: StronEventFormat;
  organizerUid: string;
  ticketTypeId: string;
  ticketLabel?: string | null;
  ticketNumber?: string | null;
  qrCode?: string | null;
  ticketPrice: number;
  totalCharged: number;
  status: StronParticipationStatus;
  participantInfo?: { field: string; value: string }[];
  couponCode?: string | null;
  couponDiscount?: number;
  enrolledAt?: string | null;
  distanceKm?: number | null;
  daysAllowed?: number | null;
  targetSteps?: number | null;
  accumulatedSteps?: number;
  leaderboardSteps?: number;
  successfulDays?: number;
  requiredDays?: number | null;
  dailyStepTarget?: number | null;
  totalWins?: number;
  totalKingSeconds?: number;
  completionOrder?: number | null;
  isWinner?: boolean;
  resultRank?: number | null;
};

export type StronKotHStanding = {
  uid: string;
  isBot?: boolean;
  steps: number;
  kingSeconds: number;
  username?: string | null;
  profileImageUrl?: string | null;
};

export type StronKotHTodayGroup = {
  status?: string;
  currentLeaderUid?: string | null;
  standings: StronKotHStanding[];
};

export type StronFaceOffTodayMatch = {
  status?: string;
  mySteps: number;
  opponentUid?: string | null;
  opponentIsBot?: boolean;
  opponentSteps: number;
  stepDifference?: number;
  opponentUsername?: string | null;
  opponentProfileImageUrl?: string | null;
  winnerUid?: string | null;
  decidedBy?: string | null;
};

export type StronProgress = {
  status?: string;
  format?: string;
  coveredSteps?: number;
  targetSteps?: number;
  percent?: number;
  distanceKm?: number | null;
  completionOrder?: number | null;
  successfulDays?: number;
  requiredDays?: number | null;
  todayGained?: number;
  /** Alias for todayGained from some API payloads. */
  todaySteps?: number;
  todayTargetMet?: boolean;
  dailyStepTarget?: number | null;
  totalKingSeconds?: number;
  /** Settled + today's accrued king time (KotH). */
  liveKingSeconds?: number;
  todayKingSeconds?: number;
  totalWins?: number;
  todayGroup?: StronKotHTodayGroup | null;
  todayMatch?: StronFaceOffTodayMatch | null;
  lastSyncedAt?: string | null;
};

export type StronKotHMatch = {
  id: string;
  dayKey: string;
  status: string;
  winnerUid?: string | null;
  currentLeaderUid?: string | null;
  members: StronKotHStanding[];
  myKingSeconds: number;
  didWin: boolean;
};

export type StronLeaderboardEntry = {
  uid: string;
  username?: string | null;
  profileImageUrl?: string | null;
  rank: number;
  score: number;
  steps?: number;
  /** Step challenge: today's event-only steps when provided by the API. */
  todaySteps?: number;
  label?: string;
  status?: string | null;
  distanceKm?: number | null;
  targetSteps?: number | null;
  completionOrder?: number | null;
  completedAt?: string | null;
  activatedAt?: string | null;
  enrolledAt?: string | null;
  lastSyncedAt?: string | null;
  finishDurationSeconds?: number | null;
  isFinished?: boolean;
  successfulDays?: number | null;
  requiredDays?: number | null;
};

const asString = (value: unknown, fallback = ""): string =>
  value == null ? fallback : String(value);

const asNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const asNumberOrNull = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const parseStronParticipation = (
  json: Record<string, unknown> | null | undefined,
): StronParticipation | null => {
  if (!json || typeof json !== "object") return null;
  const uid = asString(json.uid);
  const eventKey = asString(json.eventKey);
  if (!uid || !eventKey) return null;

  return {
    id: asString(json._id || json.id, `${uid}:${eventKey}`),
    uid,
    eventKey,
    format: asString(json.format, "marathon") as StronEventFormat,
    organizerUid: asString(json.organizerUid),
    ticketTypeId: asString(json.ticketTypeId),
    ticketLabel: json.ticketLabel == null ? null : asString(json.ticketLabel),
    ticketNumber: json.ticketNumber == null ? null : asString(json.ticketNumber),
    qrCode: json.qrCode == null ? null : asString(json.qrCode),
    ticketPrice: asNumber(json.ticketPrice),
    totalCharged: asNumber(json.totalCharged, asNumber(json.ticketPrice)),
    status: asString(json.status, "registered") as StronParticipationStatus,
    participantInfo: Array.isArray(json.participantInfo)
      ? (json.participantInfo as Record<string, unknown>[])
          .map((row) => ({
            field: asString(row.field),
            value: asString(row.value),
          }))
          .filter((row) => row.field)
      : [],
    couponCode: json.couponCode == null ? null : asString(json.couponCode),
    couponDiscount: asNumber(json.couponDiscount),
    enrolledAt: json.enrolledAt == null ? null : asString(json.enrolledAt),
    distanceKm: asNumberOrNull(json.distanceKm),
    daysAllowed: asNumberOrNull(json.daysAllowed),
    targetSteps: asNumberOrNull(json.targetSteps),
    accumulatedSteps: asNumber(json.accumulatedSteps),
    leaderboardSteps: asNumber(json.leaderboardSteps),
    successfulDays: asNumber(json.successfulDays),
    requiredDays: asNumberOrNull(json.requiredDays),
    dailyStepTarget: asNumberOrNull(json.dailyStepTarget),
    totalWins: asNumber(json.totalWins),
    totalKingSeconds: asNumber(json.totalKingSeconds),
    completionOrder: asNumberOrNull(json.completionOrder),
    isWinner: json.isWinner === true,
    resultRank: asNumberOrNull(json.resultRank),
  };
};

export const parseStronProgress = (
  json: Record<string, unknown> | null | undefined,
): StronProgress | null => {
  if (!json || typeof json !== "object") return null;
  const rawGroup = json.todayGroup as Record<string, unknown> | null | undefined;
  let todayGroup: StronKotHTodayGroup | null = null;
  if (rawGroup && typeof rawGroup === "object") {
    const standingsRaw = Array.isArray(rawGroup.standings) ? rawGroup.standings : [];
    todayGroup = {
      status: rawGroup.status == null ? undefined : asString(rawGroup.status),
      currentLeaderUid:
        rawGroup.currentLeaderUid == null ? null : asString(rawGroup.currentLeaderUid),
      standings: standingsRaw.map((item) => {
        const row = (item || {}) as Record<string, unknown>;
        return {
          uid: asString(row.uid),
          isBot: row.isBot === true,
          steps: asNumber(row.steps),
          kingSeconds: asNumber(row.kingSeconds),
          username: row.username == null ? null : asString(row.username),
          profileImageUrl: row.profileImageUrl == null ? null : asString(row.profileImageUrl),
        };
      }),
    };
  }
  const rawMatch = json.todayMatch as Record<string, unknown> | null | undefined;
  let todayMatch: StronFaceOffTodayMatch | null = null;
  if (rawMatch && typeof rawMatch === "object") {
    todayMatch = {
      status: rawMatch.status == null ? undefined : asString(rawMatch.status),
      mySteps: asNumber(rawMatch.mySteps),
      opponentUid: rawMatch.opponentUid == null ? null : asString(rawMatch.opponentUid),
      opponentIsBot: rawMatch.opponentIsBot === true,
      opponentSteps: asNumber(rawMatch.opponentSteps),
      stepDifference: asNumber(
        rawMatch.stepDifference ?? asNumber(rawMatch.mySteps) - asNumber(rawMatch.opponentSteps),
      ),
      opponentUsername:
        rawMatch.opponentUsername == null ? null : asString(rawMatch.opponentUsername),
      opponentProfileImageUrl:
        rawMatch.opponentProfileImageUrl == null
          ? null
          : asString(rawMatch.opponentProfileImageUrl),
      winnerUid: rawMatch.winnerUid == null ? null : asString(rawMatch.winnerUid),
      decidedBy: rawMatch.decidedBy == null ? null : asString(rawMatch.decidedBy),
    };
  }

  return {
    status: json.status == null ? undefined : asString(json.status),
    format: json.format == null ? undefined : asString(json.format),
    coveredSteps: asNumber(json.coveredSteps ?? json.accumulatedSteps),
    targetSteps: asNumber(json.targetSteps),
    percent: asNumber(json.percent ?? json.progressPercent),
    distanceKm: asNumberOrNull(json.distanceKm),
    completionOrder: asNumberOrNull(json.completionOrder),
    successfulDays: asNumber(json.successfulDays),
    requiredDays: asNumberOrNull(json.requiredDays),
    todayGained: asNumber(json.todayGained ?? json.todaySteps),
    todaySteps: asNumber(json.todaySteps ?? json.todayGained),
    todayTargetMet: json.todayTargetMet === true,
    dailyStepTarget: asNumberOrNull(json.dailyStepTarget),
    totalKingSeconds: asNumber(json.totalKingSeconds),
    liveKingSeconds: asNumberOrNull(json.liveKingSeconds) ?? undefined,
    todayKingSeconds: asNumberOrNull(json.todayKingSeconds) ?? undefined,
    totalWins: asNumber(json.totalWins),
    todayGroup,
    todayMatch,
    lastSyncedAt: json.lastSyncedAt == null ? null : asString(json.lastSyncedAt),
  };
};

export const parseKotHMatches = (raw: unknown, myUid?: string | null): StronKotHMatch[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = (item || {}) as Record<string, unknown>;

    // KotH groups use `members`; Face Off matches use playerA / playerB.
    let membersRaw = Array.isArray(row.members) ? row.members : [];
    if (!membersRaw.length && (row.playerA || row.playerB)) {
      membersRaw = [row.playerA, row.playerB].filter(Boolean);
    }

    const members = membersRaw.map((m) => {
      const mem = (m || {}) as Record<string, unknown>;
      return {
        uid: asString(mem.uid),
        isBot: mem.isBot === true,
        steps: asNumber(mem.steps),
        kingSeconds: asNumber(mem.kingSeconds),
        username: mem.username == null ? null : asString(mem.username),
        profileImageUrl: mem.profileImageUrl == null ? null : asString(mem.profileImageUrl),
      };
    });
    const mine = myUid ? members.find((m) => m.uid === myUid) : null;
    const winnerUid = row.winnerUid == null ? null : asString(row.winnerUid);
    return {
      id: asString(row._id || row.id, `match-${index}`),
      dayKey: asString(row.dayKey),
      status: asString(row.status, "completed"),
      winnerUid,
      currentLeaderUid: row.currentLeaderUid == null ? null : asString(row.currentLeaderUid),
      members,
      myKingSeconds: mine?.kingSeconds ?? 0,
      didWin: Boolean(myUid && winnerUid && winnerUid === myUid),
    };
  });
};

export const parseLeaderboard = (raw: unknown): StronLeaderboardEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = (item || {}) as Record<string, unknown>;
    // Prefer today's event steps, then explicit totals — never successfulDays.
    const stepsRaw =
      row.todaySteps ??
      row.steps ??
      row.totalEventSteps ??
      row.totalSteps ??
      row.leaderboardSteps ??
      row.coveredSteps ??
      row.accumulatedSteps;
    return {
      uid: asString(row.uid, `u${index}`),
      username:
        row.username != null && String(row.username).trim()
          ? asString(row.username)
          : row.name != null && String(row.name).trim()
            ? asString(row.name)
            : null,
      profileImageUrl: row.profileImageUrl == null ? null : asString(row.profileImageUrl),
      rank: asNumber(row.rank, index + 1),
      score: asNumber(
        row.score ??
          row.liveKingSeconds ??
          row.totalWins ??
          row.totalKingSeconds ??
          row.successfulDays ??
          row.coveredSteps ??
          row.leaderboardSteps ??
          row.totalSteps ??
          row.accumulatedSteps,
      ),
      steps: stepsRaw == null ? undefined : asNumber(stepsRaw),
      todaySteps: row.todaySteps == null ? undefined : asNumber(row.todaySteps),
      label:
        row.label == null
          ? row.ticketLabel == null
            ? undefined
            : asString(row.ticketLabel)
          : asString(row.label),
      status: row.status == null ? null : asString(row.status),
      distanceKm: asNumberOrNull(row.distanceKm),
      targetSteps: asNumberOrNull(row.targetSteps),
      completionOrder: asNumberOrNull(row.completionOrder),
      completedAt: row.completedAt == null ? null : asString(row.completedAt),
      activatedAt: row.activatedAt == null ? null : asString(row.activatedAt),
      enrolledAt: row.enrolledAt == null ? null : asString(row.enrolledAt),
      lastSyncedAt: row.lastSyncedAt == null ? null : asString(row.lastSyncedAt),
      finishDurationSeconds: asNumberOrNull(row.finishDurationSeconds),
      isFinished:
        row.isFinished === true ||
        row.completionOrder != null ||
        asString(row.status) === "completed",
      successfulDays: asNumberOrNull(row.successfulDays),
      requiredDays: asNumberOrNull(row.requiredDays),
    };
  });
};

export interface StronParticipationResponse {
  success: boolean;
  participation: Record<string, unknown> | null;
}

export interface StronProgressResponse {
  success: boolean;
  progress: Record<string, unknown>;
}

export interface StronLeaderboardResponse {
  success: boolean;
  leaderboard: unknown;
}

export interface StronMatchesResponse {
  success: boolean;
  matches: unknown[];
}
