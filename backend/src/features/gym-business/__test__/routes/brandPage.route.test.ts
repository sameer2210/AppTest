import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { createTestMongo } from "@/test-helpers/helpers.js";
import { createGymTestContext, createTestPlan } from "../helpers.js";

describe("gym-business: brandPage.route (public + owner)", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    process.env.PUBLIC_WEB_BASE_URL = "https://stron.in";
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("serves the public brand page without a token and never leaks owner fields", async () => {
    const ctx = await createGymTestContext("owner-uid-brand-http-pub", {
      businessName: "Public Peak Gym",
      slug: "public-peak-gym",
    });
    await createTestPlan(ctx.businessId, {
      name: "Pro Premium",
      price: 4500,
      billingCycle: "QUARTERLY",
      duration: 3,
    });

    const res = await request(app).get("/api/v1/brand/public-peak-gym");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.business.businessName).toBe("Public Peak Gym");
    expect(res.body.data.business.phone).toBeUndefined();
    expect(res.body.data.business.ownerId).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/9876543210/);
    expect(res.body.data.plans[0].name).toBe("Pro Premium");
    expect(res.body.data.plans[0].gatewayPlanId).toBeUndefined();
  });

  it("records a public visit and reflects it on home-summary and owner brand-page", async () => {
    const ctx = await createGymTestContext("owner-uid-brand-http-visit", {
      businessName: "Visit Peak Gym",
      slug: "visit-peak-gym",
    });
    const token = ctx.token;

    const missing = await request(app).get("/api/v1/brand/does-not-exist-gym");
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe("brand_page_not_found");

    const visit = await request(app)
      .post("/api/v1/brand/visit-peak-gym/visit")
      .send({ visitorHash: "device-hash-001" });
    expect(visit.status).toBe(200);
    expect(visit.body.data.visitsToday).toBe(1);

    const again = await request(app)
      .post("/api/v1/brand/visit-peak-gym/visit")
      .send({ visitorHash: "device-hash-001" });
    expect(again.body.data.visitsToday).toBe(1);

    const summary = await request(app)
      .get("/api/v1/business/home-summary")
      .set({ Authorization: `Bearer ${token}` });
    expect(summary.status).toBe(200);
    expect(summary.body.data.brandPage.visitsToday).toBe(1);
    expect(summary.body.data.brandPage.shareUrl).toBe("https://stron.in/gym/visit-peak-gym");

    const owner = await request(app)
      .get("/api/v1/business/brand-page")
      .set({ Authorization: `Bearer ${token}` });
    expect(owner.status).toBe(200);
    expect(owner.body.data.stats.visitsToday).toBe(1);
    expect(owner.body.data.shareUrl).toBe("https://stron.in/gym/visit-peak-gym");
  });

  it("rejects owner brand-page without auth", async () => {
    const res = await request(app).get("/api/v1/business/brand-page");
    expect(res.status).toBe(401);
  });

  it("rejects owner brand-page when the user has no gym", async () => {
    const token = signAccessToken({
      uid: "owner-uid-brand-http-none",
      email: "none@testgym.com",
    });
    const res = await request(app)
      .get("/api/v1/business/brand-page")
      .set({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("business_not_found");
  });
});
