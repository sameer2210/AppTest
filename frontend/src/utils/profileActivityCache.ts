import type { StronReward } from "@/models/stronManaged/reward";

export type ProfileActivityCache = {
  uid: string;
  fetchedAt: number;
  historyMap: Record<string, number>;
  eventCount: number;
  recentEvents: {
    id: string;
    eventKey: string;
    title: string;
    actionLabel: string;
    tag: string;
    eventStatus?: string;
    progressLabel?: string | null;
    progressPercent?: number | null;
  }[];
  rewardPreviews: StronReward[];
};

let profileActivityCache: ProfileActivityCache | null = null;

export const getProfileActivityCache = (): ProfileActivityCache | null => profileActivityCache;

export const setProfileActivityCache = (cache: ProfileActivityCache | null): void => {
  profileActivityCache = cache;
};

export const clearProfileActivityCache = (): void => {
  profileActivityCache = null;
};
