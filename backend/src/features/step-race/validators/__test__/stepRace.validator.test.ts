import { describe, it, expect } from "vitest";
import {
  searchOpponentsSchema,
  createStepRaceSchema,
  updateRaceProgressSchema,
  completeRaceSchema,
  rivalryHistorySchema,
  userIdParamSchema,
  leaderboardQuerySchema,
} from "../stepRace.validator.js";

describe("step-race: stepRace.validator", () => {
  it("validates searchOpponentsSchema", () => {
    expect(searchOpponentsSchema.query.safeParse({ q: "Alex" }).success).toBe(true);
    expect(searchOpponentsSchema.query.safeParse({ q: "A" }).success).toBe(false);
  });

  it("validates createStepRaceSchema", () => {
    expect(
      createStepRaceSchema.body.safeParse({
        opponentUid: "opp-1",
        opponentType: "HUMAN",
        duration: 30,
        startSteps: 0,
      }).success,
    ).toBe(true);

    expect(
      createStepRaceSchema.body.safeParse({
        opponentUid: "",
        opponentType: "HUMAN",
      }).success,
    ).toBe(false);
  });

  it("validates updateRaceProgressSchema and completeRaceSchema", () => {
    expect(
      updateRaceProgressSchema.body.safeParse({
        raceId: "race-1",
        userSteps: 2500,
        userTimeSeconds: 120,
      }).success,
    ).toBe(true);

    expect(
      updateRaceProgressSchema.body.safeParse({
        raceId: "race-1",
        userSteps: -1,
      }).success,
    ).toBe(false);

    expect(
      completeRaceSchema.body.safeParse({
        raceId: "race-1",
        userSteps: 5000,
      }).success,
    ).toBe(true);
  });

  it("validates rivalryHistorySchema, userIdParamSchema, and leaderboardQuerySchema", () => {
    expect(
      rivalryHistorySchema.query.safeParse({
        opponentUid: "opp-2",
        userId: "user-1",
      }).success,
    ).toBe(true);

    expect(
      rivalryHistorySchema.query.safeParse({
        opponentUid: "",
      }).success,
    ).toBe(false);

    expect(userIdParamSchema.params.safeParse({ userId: "user-1" }).success).toBe(true);
    expect(userIdParamSchema.params.safeParse({ userId: "" }).success).toBe(false);

    expect(leaderboardQuerySchema.query.safeParse({ limit: "50" }).success).toBe(true);
    expect(leaderboardQuerySchema.query.safeParse({ limit: "150" }).success).toBe(false);
  });
});
