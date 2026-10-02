import type {
  StronKotHStanding,
  StronLeaderboardEntry,
  StronProgress,
} from "@/models/stronManaged/participation";

const KOTH_HOW_IT_WORKS = [
  "Groups of 2-5 made every day",
  "King Time: The time you spend having the most steps in your group",
  "Collect King Time to win",
  "Event tie breaker by total steps",
];

const FACE_OFF_HOW_IT_WORKS = [
  "1v1 matches with strangers",
  "Person with most steps by end of the competition wins",
  "Instant Knock out if one person leads other by more than 3k steps",
  "Top performer by the end of the week win",
];

export const duelHowItWorksBullets = (format?: string | null) =>
  format === "face_off" ? FACE_OFF_HOW_IT_WORKS : KOTH_HOW_IT_WORKS;

export const pickTodayKing = (
  progress: StronProgress | null,
): { standing: StronKotHStanding | null; rank: number } => {
  const standings = progress?.todayGroup?.standings || [];
  if (!standings.length) return { standing: null, rank: 1 };
  const leaderUid = progress?.todayGroup?.currentLeaderUid;
  const byKing = [...standings].sort((a, b) => b.kingSeconds - a.kingSeconds);
  const standing = (leaderUid && standings.find((s) => s.uid === leaderUid)) || byKing[0] || null;
  const rank = standing
    ? standings
        .slice()
        .sort((a, b) => b.steps - a.steps)
        .findIndex((s) => s.uid === standing.uid) + 1
    : 1;
  return { standing, rank: rank || 1 };
};

export const myLeaderboardRank = (
  entries: StronLeaderboardEntry[],
  myUid?: string | null,
): number | null => {
  if (!myUid) return null;
  const row = entries.find((e) => e.uid === myUid);
  return row?.rank ?? null;
};
