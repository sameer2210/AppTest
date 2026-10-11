import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { StepRaceModel } from "@/features/step-race/index.js";
import { UserModel } from "@/features/identity-auth/index.js";
import {
  countShadowRacesAway,
  getStepRaceHistoryService,
  getStepRaceStatsService,
} from "@/features/step-race/services/stepRace.service.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

const shadowUid = "shadow-target-user";
const otherUser = "other-racer-user";

const baseRace = (overrides = {}) => ({
  raceId: `race-${Math.random().toString(36).slice(2, 10)}`,
  userId: otherUser,
  opponent: {
    uid: shadowUid,
    username: "Shadow User",
    type: "shadow",
    currentSteps: 1000,
    shadowData: {
      uid: shadowUid,
      username: "Shadow User",
      currentSteps: 1000,
    },
  },
  startTime: new Date("2026-08-20T10:00:00.000Z"),
  endTime: new Date("2026-08-20T11:00:00.000Z"),
  status: "completed",
  winner: "opponent",
  ...overrides,
});

describe("step-race: stepRace.service", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    await UserModel.create({
      uid: shadowUid,
      email: "shadow@test.com",
      name: "Shadow Target",
      bestPaceSeconds: 600,
    });

    const baseline = new Date("2026-08-25T12:00:00.000Z");

    await StepRaceModel.create([
      baseRace({
        raceId: "race-before-baseline",
        createdAt: new Date("2026-08-24T10:00:00.000Z"),
        endTime: new Date("2026-08-24T11:00:00.000Z"),
      }),
      baseRace({
        raceId: "race-after-1",
        createdAt: new Date("2026-08-26T10:00:00.000Z"),
        endTime: new Date("2026-08-26T11:00:00.000Z"),
      }),
      baseRace({
        raceId: "race-after-2",
        createdAt: new Date("2026-08-27T10:00:00.000Z"),
        endTime: new Date("2026-08-27T11:00:00.000Z"),
      }),
      baseRace({
        raceId: "race-active",
        status: "active",
        createdAt: new Date("2026-08-28T10:00:00.000Z"),
        endTime: new Date("2026-08-28T11:00:00.000Z"),
      }),
      {
        raceId: "manual-real-race",
        userId: shadowUid,
        opponent: {
          uid: "real-opponent",
          username: "Real Opponent",
          type: "real",
          currentSteps: 1000,
        },
        startTime: baseline,
        endTime: baseline,
        createdAt: baseline,
        status: "completed",
        winner: "user",
      },
    ]);
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("counts shadow races completed after baseline timestamp", async () => {
    const baseline = new Date("2026-08-25T12:00:00.000Z");
    const count = await countShadowRacesAway(shadowUid, baseline);
    expect(count).toBe(2);
  });

  it("returns zero when user has no races as opponent", async () => {
    const count = await countShadowRacesAway("non-existent-user", new Date());
    expect(count).toBe(0);
  });

  it("getStepRaceStatsService returns stats aggregate for user", async () => {
    const stats = await getStepRaceStatsService({ userId: shadowUid });
    expect(stats).toBeDefined();
    expect(stats.totalRaces).toBeGreaterThanOrEqual(1);
  });

  it("uses a real 200-step target when computing history pace", async () => {
    await StepRaceModel.create({
      raceId: "race-target-200",
      userId: "pace-200-user",
      opponent: { uid: "opp-200", username: "Opp", type: "real", currentSteps: 200 },
      startTime: new Date("2026-08-20T10:00:00.000Z"),
      endTime: new Date("2026-08-20T10:05:00.000Z"),
      status: "completed",
      winner: "user",
      targetSteps: 200,
      userSteps: 200,
      userTimeSeconds: 100,
      opponentSteps: 180,
      opponentPaceSeconds: 120,
    });

    const history = await getStepRaceHistoryService({ userId: "pace-200-user" });
    expect(history[0]?.finalPace).toBe("01:40");
  });
});
