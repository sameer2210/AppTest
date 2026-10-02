import { readFileSync } from "node:fs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("production port routes", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "prod-port-owner";
  let token: string;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
    token = signAccessToken({ uid, email: "port@stron.in" });
    await UserModel.create({ uid, email: "port@stron.in", username: "portowner" });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("serves the production dashboard summary for an owner without a gym", async () => {
    const res = await request(app)
      .get("/api/v1/business/dashboard-summary")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile).toBeNull();
    expect(res.body.data.memberValidity.activeCount).toBe(0);
  });

  it("serves listing and connect smart-link pages", async () => {
    const listing = await request(app).get("/listing/not-a-real-gym");
    expect(listing.status).toBe(200);
    expect(listing.headers["content-type"]).toMatch(/html/);
    expect(listing.text).toContain("STRON Business Listing");

    const connect = await request(app).get(`/connect/${uid}`);
    expect(connect.status).toBe(200);
    expect(connect.text).toContain("Connect with portowner");
  });

  it("reports upload configuration and accepts nested public keys", async () => {
    const status = await request(app).get("/api/upload/status");
    expect(status.status).toBe(200);
    expect(status.body.success).toBe(true);
    expect(typeof status.body.configured).toBe("boolean");

    const missing = await request(app).get("/api/upload/public/gym-gallery/one.jpg");
    expect([404, 503]).toContain(missing.status);
  });

  it("includes plan and listing paths in the Apple App Site Association file", () => {
    const fileUrl = new URL(
      "../../../../../public/.well-known/apple-app-site-association",
      import.meta.url,
    );
    const body = JSON.parse(readFileSync(fileUrl, "utf8")) as {
      applinks: { details: Array<{ paths: string[] }> };
    };
    const paths = body.applinks.details[0].paths;
    expect(paths).toEqual(expect.arrayContaining(["/plan/*", "/listing/*", "/connect/*", "/user/*"]));
  });
});
