import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("user-engagement: feedback.route", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "fb-route-user";
  let token: string;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    token = signAccessToken({ uid, email: "fb-route@stron.in" });

    await UserModel.create({
      uid,
      email: "fb-route@stron.in",
      username: "FeedbackUser",
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("POST /api/feedback allows anonymous feedback submission", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .send({ rating: 5, feedback: "Awesome feature" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/feedback allows authenticated feedback submission", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: 4, feedback: "Keep improving", isLiked: true });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBe(uid);
  });

  it("POST /api/feedback rejects invalid rating with 400", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .send({ rating: 10 }); // Schema expects 1..5

    expect(res.status).toBe(400);
  });
});
