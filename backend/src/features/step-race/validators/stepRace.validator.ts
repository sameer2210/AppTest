import { z } from "zod";

export const searchOpponentsSchema = {
  query: z.object({
    q: z.string().min(2, "Search query must be at least 2 characters"),
  }),
};

export const createStepRaceSchema = {
  body: z.object({
    opponentUid: z.string().min(1, "Opponent UID is required"),
    opponentType: z.string().min(1, "Opponent type is required"),
    duration: z.coerce.number().positive().optional(),
    userId: z.string().optional(),
    startSteps: z.coerce.number().nonnegative().optional(),
  }),
};

export const updateRaceProgressSchema = {
  body: z.object({
    raceId: z.string().min(1, "Race ID is required"),
    userSteps: z.coerce.number().nonnegative("User steps must be non-negative"),
    userTimeSeconds: z.coerce.number().nonnegative().optional(),
  }),
};

export const completeRaceSchema = {
  body: z.object({
    raceId: z.string().min(1, "Race ID is required"),
    userSteps: z.coerce.number().nonnegative().optional(),
    userTimeSeconds: z.coerce.number().nonnegative().optional(),
  }),
};

export const rivalryHistorySchema = {
  query: z.object({
    userId: z.string().optional(),
    opponentUid: z.string().min(1, "Opponent UID is required"),
  }),
};

export const userIdParamSchema = {
  params: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
};

export const leaderboardQuerySchema = {
  query: z.object({
    limit: z.coerce.number().positive().max(100).optional(),
  }),
};
