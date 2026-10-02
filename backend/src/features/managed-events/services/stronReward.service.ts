// Issue and list virtual medals + certificates for completed STRON events.

import StronReward from "../models/stronReward.model.js";
import type { IStronReward } from "../types/index.js";
import StronParticipation from "../models/stronParticipation.model.js";
import { UserModel } from "../../identity-auth/index.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { MEDAL_BY_RANK } from "../../../constants/index.js";


const sortParticipations = (format: string, rows: ServiceParams[]) => {
  const list = [...rows];
  if (format === "king_of_the_hill") {
    list.sort((a, b) => (b.totalKingSeconds || 0) - (a.totalKingSeconds || 0));
  } else if (format === "face_off") {
    list.sort((a, b) => (b.totalWins || 0) - (a.totalWins || 0));
  } else if (format === "virtual_step_challenge") {
    list.sort((a, b) => {
      if ((b.successfulDays || 0) !== (a.successfulDays || 0)) {
        return (b.successfulDays || 0) - (a.successfulDays || 0);
      }
      return (b.leaderboardSteps || 0) - (a.leaderboardSteps || 0);
    });
  } else {
    // marathon: finishers first by completionOrder, then by steps
    list.sort((a, b) => {
      const aDone = a.status === "completed" || a.completedAt ? 1 : 0;
      const bDone = b.status === "completed" || b.completedAt ? 1 : 0;
      if (bDone !== aDone) return bDone - aDone;
      if (a.completionOrder != null && b.completionOrder != null) {
        return a.completionOrder - b.completionOrder;
      }
      if (a.completionOrder != null) return -1;
      if (b.completionOrder != null) return 1;
      return (b.leaderboardSteps || 0) - (a.leaderboardSteps || 0);
    });
  }
  return list;
};

const buildStats = (format: string, p: ServiceParams) => {
  const totalSteps = Number(p.leaderboardSteps || p.accumulatedSteps || 0);
  if (format === "king_of_the_hill") {
    return {
      kingTimeSeconds: Number(p.totalKingSeconds || 0),
      totalSteps,
    };
  }
  if (format === "face_off") {
    return {
      totalWins: Number(p.totalWins || 0),
      totalSteps,
    };
  }
  if (format === "virtual_step_challenge") {
    return {
      successfulDays: Number(p.successfulDays || 0),
      requiredDays: Number(p.requiredDays || 0) || null,
      totalSteps,
    };
  }
  // marathon
  const target = Number(p.targetSteps || 0);
  const distanceTargetKm = Number(p.distanceKm || 0) || null;
  const distanceKm =
    target > 0 && distanceTargetKm
      ? Math.round((Math.min(totalSteps, target) / target) * distanceTargetKm * 100) / 100
      : null;
  return {
    totalSteps,
    distanceKm,
    distanceTargetKm,
  };
};

const serializeReward = (doc: ServiceParams) => {
  const raw = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(raw._id),
    uid: raw.uid,
    eventKey: raw.eventKey,
    type: raw.type,
    medalTier: raw.medalTier || null,
    rank: raw.rank ?? null,
    format: raw.format,
    eventTitle: raw.eventTitle,
    venue: raw.venue || null,
    eventDate: raw.eventDate || null,
    displayName: raw.displayName || null,
    avatarUrl: raw.avatarUrl || null,
    stats: raw.stats || {},
    issuedAt: raw.issuedAt || raw.createdAt || null,
  };
};

/**
 * Rank all participants and issue certificate (everyone) + medal (top 3).
 * Idempotent via unique (uid, eventKey, type).
 */
export const issueRewardsForEvent = async (event: ServiceParams) => {
  if (!event?.key) return { certificates: 0, medals: 0 };

  const rows = await StronParticipation.find({
    eventKey: event.key,
    status: { $in: ["registered", "active", "completed", "expired"] },
  }).lean();

  if (!rows.length) return { certificates: 0, medals: 0 };

  const ranked = sortParticipations(event.format, rows);
  const uids = ranked.map((r) => r.uid);
  const users = await UserModel.find({ uid: { $in: uids } })
    .select("uid username receiverName profileImageUrl")
    .lean();
  const userByUid = new Map(users.map((u) => [u.uid, u]));

  let certificates = 0;
  let medals = 0;

  for (let i = 0; i < ranked.length; i += 1) {
    const p = ranked[i];
    const rank = i + 1;
    const user = userByUid.get(p.uid);
    const displayName =
      user?.username?.trim() || user?.receiverName?.trim() || "Athlete";
    const base = {
      uid: p.uid,
      eventKey: event.key,
      participationId: p._id,
      format: event.format,
      eventTitle: event.title,
      venue: event.destination || null,
      eventDate: event.startDate || event.completedAt || new Date(),
      rank,
      displayName,
      avatarUrl: user?.profileImageUrl || null,
      stats: buildStats(event.format, p),
      issuedAt: new Date(),
    };

    // Certificate for every participant
    const certResult = await StronReward.updateOne(
      { uid: p.uid, eventKey: event.key, type: "certificate" },
      { $setOnInsert: { ...base, type: "certificate", medalTier: null } },
      { upsert: true },
    );
    if (certResult.upsertedCount) certificates += 1;

    // Medal for top 3
    const tier = MEDAL_BY_RANK[rank];
    if (tier) {
      const medalResult = await StronReward.updateOne(
        { uid: p.uid, eventKey: event.key, type: "medal" },
        {
          $setOnInsert: {
            ...base,
            type: "medal",
            medalTier: tier,
          },
        },
        { upsert: true },
      );
      if (medalResult.upsertedCount) medals += 1;
    }

    // Persist final rank on participation for all formats
    await StronParticipation.updateOne(
      { _id: p._id },
      {
        $set: {
          resultRank: rank,
          isWinner: rank === 1,
        },
      },
    );
  }

  return { certificates, medals };
};

export const listMyRewards = async (uid: string) => {
  const rewards = await StronReward.find({ uid })
    .sort({ issuedAt: -1 })
    .lean();
  return rewards.map(serializeReward);
};

export const getRewardById = async ({ uid, rewardId }: ServiceParams) => {
  const reward = await StronReward.findOne({ _id: rewardId, uid }).lean();
  if (!reward) {
    throw codedError("reward_not_found", "Reward not found.");
  }
  return serializeReward(reward);
};

/** Compact preview strip for profile: medal cards first, then certificates. */
export const listRewardPreviews = async (uid: string, limit = 12) => {
  const medals = await StronReward.find({ uid, type: "medal" })
    .sort({ issuedAt: -1 })
    .limit(limit)
    .lean();
  if (medals.length >= limit) {
    return medals.map(serializeReward);
  }
  const certs = await StronReward.find({ uid, type: "certificate" })
    .sort({ issuedAt: -1 })
    .limit(limit - medals.length)
    .lean();
  return [...medals, ...certs].map(serializeReward);
};

export const getBadgeCounts = async (uid: string) => {
  const [gold, silver, bronze] = await Promise.all([
    StronReward.countDocuments({ uid, type: "medal", medalTier: "gold" }),
    StronReward.countDocuments({ uid, type: "medal", medalTier: "silver" }),
    StronReward.countDocuments({ uid, type: "medal", medalTier: "bronze" }),
  ]);
  return {
    gold,
    silver,
    bronze,
    // Hex badge strip in Figma — map to medal tiers for now
    bounceBack: gold,
    closeCall: silver,
    knockout: bronze,
  };
};
