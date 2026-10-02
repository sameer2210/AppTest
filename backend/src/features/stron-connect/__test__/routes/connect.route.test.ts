import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("stron-connect: connect.route", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "connect-route-user";
  let token: string;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    token = signAccessToken({ uid, email: "connect-route@test.com" });

    await UserModel.create({
      uid,
      email: "connect-route@test.com",
      username: "ConnectRouteUser",
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("GET /api/v1/connect/me rejects unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/v1/connect/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/connect/me returns connect profile for authenticated user", async () => {
    const res = await request(app)
      .get("/api/v1/connect/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.qr.displayCode).toBeDefined();
    expect(res.body.qr.qrPayload).toBeDefined();
  });

  it("POST /api/v1/connect/scan rejects invalid or unknown code with 400", async () => {
    const res = await request(app)
      .post("/api/v1/connect/scan")
      .set("Authorization", `Bearer ${token}`)
      .send({ payload: "ZZZZZ" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("invalid_qr");
  });

  it("POST /api/v1/connect/checkin validates request body and rejects invalid type with 400", async () => {
    const res = await request(app)
      .post("/api/v1/connect/checkin")
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "invalid_type" });

    expect(res.status).toBe(400);
  });
});
