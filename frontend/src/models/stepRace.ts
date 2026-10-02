/**
 * Step Race Models
 * Handles step race data structures including shadow/clone opponents
 */

export type StepRaceStatus = "lobby" | "searching" | "active" | "completed" | "expired";

export type StepRaceOpponentType = "real" | "shadow" | "random";

export interface StepRaceShadow {
  uid: string;
  username: string;
  profileImageUrl?: string;
  profession?: string;
  bio?: string;
  bestStepCount: number;
  originalBestStepCount: number; // For tracking decay
  bestPaceSeconds?: number;
  lastActiveDate: string; // ISO date string
  decayRate: number; // 0.10 for 10% daily decay
  isOnline: boolean;
}

export interface StepRaceOpponent {
  uid: string;
  username: string;
  profileImageUrl?: string;
  profession?: string;
  bio?: string;
  type: StepRaceOpponentType;
  currentSteps: number;
  shadowData?: StepRaceShadow;
}

export interface StepRace {
  raceId: string;
  userId: string;
  opponent: StepRaceOpponent;
  targetSteps?: number;
  opponentPaceSeconds?: number;
  userTimeSeconds?: number;
  startSteps?: number;
  userSteps: number;
  opponentSteps: number;
  status: StepRaceStatus;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  duration: number; // Duration in hours
  winner?: "user" | "opponent" | "draw";
  createdAt: string;
  updatedAt: string;
}

export interface StepRaceStats {
  racesToday: number;
  wins: number;
  losses: number;
  streak: number;
  totalRaces: number;
  bestPaceSeconds?: number;
  currentRace?: StepRace;
  shadowRacesAway?: number;
}

export interface StepRaceSearchResult {
  uid: string;
  username: string;
  profileImageUrl?: string;
  bestStepCount: number;
  bestPaceSeconds?: number;
  isOnline: boolean;
  lastActiveDate: string;
  bio?: string;
  shortBio?: string;
}

export interface CreateStepRaceRequest {
  opponentUid: string;
  opponentType: StepRaceOpponentType;
  duration?: number; // Duration in hours, default 24
  userId?: string;
  startSteps?: number;
}

export interface UpdateStepRaceRequest {
  raceId: string;
  userSteps: number;
  userTimeSeconds?: number;
}

export interface StepRaceLeaderboard {
  uid: string;
  username: string;
  profileImageUrl?: string;
  totalWins: number;
  currentStreak: number;
  bestStepCount: number;
  bestPaceSeconds?: number;
}

// Helper functions for shadow decay calculation
export const calculateDecayedSteps = (
  originalSteps: number,
  lastActiveDate: string,
  decayRate: number = 0.1,
): number => {
  const lastActive = new Date(lastActiveDate);
  const now = new Date();
  const daysInactive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

  if (daysInactive <= 0) return originalSteps;

  const decayedSteps = originalSteps * Math.pow(1 - decayRate, daysInactive);
  return Math.max(0, Math.floor(decayedSteps));
};

export const shouldUpdateBestScore = (currentSteps: number, bestSteps: number): boolean => {
  return currentSteps > bestSteps;
};

export const isRaceExpired = (endTime: string): boolean => {
  return new Date(endTime) < new Date();
};

export const getRaceRemainingTime = (endTime: string): number => {
  const end = new Date(endTime);
  const now = new Date();
  const remaining = end.getTime() - now.getTime();
  return Math.max(0, remaining);
};

export const formatRaceTime = (milliseconds: number): string => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};
