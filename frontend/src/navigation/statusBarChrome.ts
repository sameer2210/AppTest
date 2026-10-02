import { colors } from "@/utils/colors";

/** Solid status-bar fills for screens that should not show the default blue scrim. */
export const getSolidStatusBarColor = (pathname: string): string | null => {
  const path = pathname || "";
  // stron-event uses a transparent overlay header over the hero — no solid top fill.
  if (path.includes("organizer-preview")) return colors.statusBarDark;
  if (path.includes("event-dashboard")) return colors.statusBarDark;
  if (path.includes("event-details")) return colors.screenBgEventDetails;
  if (path.includes("participant-detail")) return colors.screenBgBlack;
  if (path.includes("organize-leaderboard")) return colors.screenBgBlack;
  if (path.includes("event-rewards")) return colors.statusBarDark;
  if (path.includes("face-off-details")) return colors.screenBgBlack;
  if (path.includes("ongoing-battle")) return colors.screenBgBlack;
  if (path.includes("google-fit-stats")) return colors.statusBarDark;
  if (path.includes("plan-preview")) return colors.statusBarDark;
  return null;
};
