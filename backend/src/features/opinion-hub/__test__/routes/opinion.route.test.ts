import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { opinionService } from "@/features/opinion-hub/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("opinion-hub: opinion.route", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "opinion-route-user-1";
  let token: string;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    token = signAccessToken({ uid, email: "opinion-route@stron.in" });

    await UserModel.create({
      uid,
      email: "opinion-route@stron.in",
      name: "Opinion Route User",
      todaysStepCount: 3000,
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("GET /api/opinion/current allows guest access and returns opinions", async () => {
    const res = await request(app).get("/api/opinion/current");
    expect(res.status).toBe(200);
    expect(res.body.opinions).toBeInstanceOf(Array);
    expect(res.body.opinions.length).toBe(3);
  });

  it("POST /api/opinion/vote rejects unauthenticated request with 401", async () => {
    const res = await request(app)
      .post("/api/opinion/vote")
      .send({ questionId: "q1", optionId: 1 });
    expect(res.status).toBe(401);
  });

  it("POST /api/opinion/vote casts vote and returns updated percentages for authenticated user", async () => {
    const poll = await opinionService.getOpinionPollDetails(uid);
    const q1 = poll.opinions[0];
    const optId = q1.options[0].optionId;

    const res = await request(app)
      .post("/api/opinion/vote")
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: q1.questionId, optionId: optId });

    expect(res.status).toBe(200);
    expect(res.body.opinions[0].userVotedOptionId).toBe(optId);
  });

  it("POST /api/opinion/vote rejects request with missing fields with 400", async () => {
    const res = await request(app)
      .post("/api/opinion/vote")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("POST /api/opinion/like toggles like state", async () => {
    const poll = await opinionService.getOpinionPollDetails(uid);
    const q1 = poll.opinions[0];

    const res = await request(app)
      .post("/api/opinion/like")
      .set("Authorization", `Bearer ${token}`)
      .send({ questionId: q1.questionId });

    expect(res.status).toBe(200);
    expect(res.body.isLiked).toBe(true);
  });
});
