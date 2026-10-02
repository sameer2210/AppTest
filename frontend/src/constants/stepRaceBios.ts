/**
 * 15 Predefined Fitness Short Bios for Step Race Opponents.
 * Displayed under opponent names when no custom short bio is set, replacing pace/speed.
 */
export const PREDEFINED_SHORT_BIOS: readonly string[] = [
  "Daily 10K step walker 🚶‍♂️",
  "Chasing daily milestones 🏃",
  "Every step counts ⚡",
  "Fitness enthusiast & runner 👟",
  "Morning walks & evening runs 🌅",
  "Marathon dreamer, daily pacer 🏅",
  "Walking my way to fitness 💪",
  "Consistency over speed 🔥",
  "Step by step, day by day 🎯",
  "Cardio lover & habit builder 🏆",
  "Weekend trail explorer 🌲",
  "Daily movement advocate ✨",
  "Pushing limits, 1K at a time 🚀",
  "Fueled by steps and discipline ⚡",
  "Always up for a step challenge 💥",
];

/**
 * Deterministically picks one of the predefined short bios for a given seed (uid / username).
 * Ensures the same opponent displays a consistent bio across searches and re-renders.
 */
export const getFallbackShortBio = (seed?: string | null): string => {
  if (!seed) return PREDEFINED_SHORT_BIOS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PREDEFINED_SHORT_BIOS.length;
  return PREDEFINED_SHORT_BIOS[index];
};

/**
 * Resolves an opponent's short bio: uses their custom shortBio / bio if set,
 * otherwise deterministically selects one of the 15 predefined short bios.
 */
export const resolveOpponentShortBio = (
  opponent?: {
    shortBio?: string | null;
    bio?: string | null;
    uid?: string | null;
    username?: string | null;
  } | null,
): string => {
  const custom = opponent?.shortBio?.trim() || opponent?.bio?.trim();
  if (custom) return custom;
  return getFallbackShortBio(opponent?.uid || opponent?.username || "default_opponent");
};
