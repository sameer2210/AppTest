export const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

export const formatExactSteps = (steps: number): string => {
  const n = Math.max(0, Math.floor(Number(steps) || 0));
  return `${n.toLocaleString("en-US")} Steps`;
};

export const formatDistanceKm = (steps: number): string => {
  const n = Math.max(0, Number(steps) || 0);
  const km = n * 0.00075;
  if (km >= 1) return `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)}km`;
  return `${Math.round(km * 1000)}m`;
};

export const formatStreakLabel = (streakDays: number): string => {

  if (streakDays <= 0) return "0 Days";
  if (streakDays === 1) return "1 Day";
  return `${streakDays} Days`;
};

export type ActivityFilter = "all" | "actions" | "feed";

