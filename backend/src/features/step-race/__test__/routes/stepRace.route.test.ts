import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("step-race: stepRace.route", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "step-race-route-user";
  let token: string;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    token = signAccessToken({ uid, email: "step-race@stron.in" });

    await UserModel.create({
      uid,
      email: "step-race@stron.in",
      name: "Step Racer",
      todaysStepCount: 4500,
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("GET /api/step-race/stats/:userId rejects unauthenticated requests with 401", async () => {
    const res = await request(app).get(`/api/step-race/stats/${uid}`);
    expect(res.status).toBe(401);
  });

  it("GET /api/step-race/stats/:userId returns stats for authenticated user", async () => {
    const res = await request(app)
      .get(`/api/step-race/stats/${uid}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalRaces");
  });

  it("GET /api/step-race/shadows returns shadow opponents list", async () => {
    const res = await request(app)
      .get("/api/step-race/shadows")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("enforces ownership and rejects access to another user's race data with 403", async () => {
    const otherUid = "some-other-user";

    const statsRes = await request(app)
      .get(`/api/step-race/stats/${otherUid}`)
      .set("Authorization", `Bearer ${token}`);
    expect(statsRes.status).toBe(403);
    expect(statsRes.body.code).toBe("forbidden");

    const activeRes = await request(app)
      .get(`/api/step-race/active/${otherUid}`)
      .set("Authorization", `Bearer ${token}`);
    expect(activeRes.status).toBe(403);
    expect(activeRes.body.code).toBe("forbidden");

    const historyRes = await request(app)
      .get(`/api/step-race/history/${otherUid}`)
      .set("Authorization", `Bearer ${token}`);
    expect(historyRes.status).toBe(403);
    expect(historyRes.body.code).toBe("forbidden");
  });

  it("GET /api/step-race/leaderboard validates query limit with Zod", async () => {
    const invalidRes = await request(app)
      .get("/api/step-race/leaderboard?limit=-1")
      .set("Authorization", `Bearer ${token}`);
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.code).toBe("validation_error");

    const validRes = await request(app)
      .get("/api/step-race/leaderboard?limit=5")
      .set("Authorization", `Bearer ${token}`);
    expect(validRes.status).toBe(200);
    expect(Array.isArray(validRes.body)).toBe(true);
  });
});

