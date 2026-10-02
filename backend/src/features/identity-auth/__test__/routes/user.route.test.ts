import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("identity-auth: user.route", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "route-user-test-001";
  let token: string;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    token = signAccessToken({ uid, email: "route-user@stron.in" });

    await UserModel.create({
      uid,
      email: "route-user@stron.in",
      username: "RouteUser",
      todaysStepCount: 1500,
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("GET /api/user/profile/:uid rejects unauthenticated requests with 401", async () => {
    const res = await request(app).get(`/api/user/profile/${uid}`);
    expect(res.status).toBe(401);
  });

  it("GET /api/user/profile/:uid returns user profile when authenticated", async () => {
    const res = await request(app)
      .get(`/api/user/profile/${uid}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.uid).toBe(uid);
    expect(res.body.username).toBe("RouteUser");
  });

  it("GET /api/user/me/roles returns individual role and no gym/trainer by default", async () => {
    const res = await request(app)
      .get("/api/user/me/roles")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.individual.username).toBe("RouteUser");
    expect(res.body.data.business.available).toBe(false);
    expect(res.body.data.trainer.available).toBe(false);
  });

  it("GET /api/user/profile/:uid returns 404 for non-existent uid", async () => {
    const otherToken = signAccessToken({ uid: "ghost-uid", email: "ghost@stron.in" });
    const res = await request(app)
      .get("/api/user/profile/non-existent-uid-999")
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
  });

  it("PUT /api/user/profile/:uid updates user profile fields", async () => {
    const res = await request(app)
      .put(`/api/user/profile/${uid}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ location: "Mumbai, India" });

    expect(res.status).toBe(200);
    expect(res.body.location).toBe("Mumbai, India");
  });
});
