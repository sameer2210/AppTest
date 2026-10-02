import type { ImageSourcePropType } from "react-native";
import { images } from "@/utils/images";
import type { StronMedalTier, StronReward } from "@/models/stronManaged/reward";

export const medalImageForReward = (reward: StronReward): ImageSourcePropType => {
  if (reward.format === "king_of_the_hill") {
    return images.REWARDS.MEDAL_KOTH;
  }
  const tier = reward.medalTier || "gold";
  if (tier === "silver") return images.REWARDS.MEDAL_SILVER;
  if (tier === "bronze") return images.REWARDS.MEDAL_BRONZE;
  return images.REWARDS.MEDAL_GOLD;
};

export const previewMedalSize = (reward: StronReward) => {
  if (reward.format === "king_of_the_hill") return { width: 93, height: 133 };
  if (reward.format === "face_off") return { width: 85, height: 132 };
  if (reward.format === "virtual_step_challenge") return { width: 106, height: 127 };
  return { width: 120, height: 140 };
};

export const rewardVisualSource = (reward: StronReward): ImageSourcePropType => {
  if (reward.type === "medal") return medalImageForReward(reward);
  return images.REWARDS.CERTIFICATE;
};

export const medalImageForTier = (tier: StronMedalTier): ImageSourcePropType => {
  if (tier === "silver") return images.REWARDS.MEDAL_SILVER;
  if (tier === "bronze") return images.REWARDS.MEDAL_BRONZE;
  return images.REWARDS.MEDAL_GOLD;
};

export const formatPlanLabelUpper = (planLabel?: string | null) => {
  const label = planLabel?.trim();
  return label ? label.toUpperCase() : "VIRTUAL MARATHON";
};

export const formatRewardDate = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export const formatKingClock = (seconds?: number | null) => {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
};

export const formatRewardSubtitle = (reward: StronReward) => {
  const date = formatRewardDate(reward.eventDate || reward.issuedAt);
  const venue = reward.venue?.trim() || "";
  if (date && venue) return `${date}  ·  ${venue}`;
  return date || venue || "STRON Event";
};

export const rewardDateVenue = (reward: StronReward) => ({
  date: formatRewardDate(reward.eventDate || reward.issuedAt),
  venue: reward.venue?.trim() || "",
});

const formatStepsShort = (steps: number) => {
  if (steps >= 1000) {
    const k = steps / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return String(Math.round(steps));
};

/** Dotted stats for the medal preview card (Figma 534:2876 / 532:2784). */
export const buildScoreParts = (reward: StronReward): string[] => {
  const parts: string[] = [];
  const { stats, format, rank } = reward;
  if (format === "king_of_the_hill") {
    parts.push(`King Time ${formatKingClock(stats.kingTimeSeconds)}`);
  } else if (format === "face_off") {
    parts.push(`Total Wins ${Math.round(stats.totalWins || 0)}`);
  } else if (format === "virtual_step_challenge") {
    const req = stats.requiredDays || 0;
    parts.push(`Successful Days ${Math.round(stats.successfulDays || 0)}${req ? `/${req}` : ""}`);
  } else if (stats.finishTimeSeconds != null) {
    parts.push(`Time To Finish ${formatKingClock(stats.finishTimeSeconds)}`);
  }
  if (rank != null) parts.push(`Rank #${rank}`);
  if (stats.totalSteps != null) {
    parts.push(`Total steps ${Math.round(stats.totalSteps).toLocaleString("en-IN")}`);
  }
  return parts;
};

export const buildScoreLine = (reward: StronReward): string =>
  buildScoreParts(reward).join("  ·  ");

export type RewardProgress = {
  left: string;
  right: string;
  ratio: number;
};

/** Marathon km bar / step-challenge steps bar. */
export const getRewardProgress = (reward: StronReward): RewardProgress | null => {
  const { stats, format } = reward;
  if (format === "marathon") {
    const target = Number(stats.distanceTargetKm || 0);
    if (!(target > 0)) return null;
    const current = Number(stats.distanceKm || 0);
    return {
      left: `${current} Km`,
      right: `${target} km`,
      ratio: Math.max(0, Math.min(1, current / target)),
    };
  }
  if (format !== "virtual_step_challenge") return null;

  const targetDays = Number(stats.requiredDays || 0);
  const currentDays = Number(stats.successfulDays || 0);
  const steps = Number(stats.totalSteps || 0);
  if (targetDays <= 0 && steps <= 0) return null;

  let ratio = 1;
  if (targetDays > 0) {
    ratio = Math.max(0, Math.min(1, currentDays / targetDays));
  }

  return {
    left: steps > 0 ? `${formatStepsShort(steps)} steps` : `${currentDays} days`,
    right: targetDays > 0 ? `${targetDays} days` : "",
    ratio,
  };
};

export const buildCertificatePillParts = (reward: StronReward): string[] => {
  const parts: string[] = [];
  const { stats, format, rank } = reward;
  if (rank != null) parts.push(`RANK #${rank}`);
  if (format === "king_of_the_hill") {
    parts.push(`KING TIME ${formatKingClock(stats.kingTimeSeconds)}`);
  } else if (format === "face_off") {
    parts.push(`TOTAL WINS ${Math.round(stats.totalWins || 0)}`);
  } else if (format === "virtual_step_challenge") {
    const req = stats.requiredDays || 0;
    parts.push(
      `SUCCESSFUL DAYS ${Math.round(stats.successfulDays || 0)}${req ? `/${req}` : ""}`,
    );
  } else if (stats.finishTimeSeconds != null) {
    parts.push(`TIME TO FINISH ${formatKingClock(stats.finishTimeSeconds)}`);
  }
  if (stats.totalSteps != null) {
    parts.push(`TOTAL STEPS ${Math.round(stats.totalSteps).toLocaleString("en-IN")}`);
  }
  return parts;
};
