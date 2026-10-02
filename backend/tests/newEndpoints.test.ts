import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/jwt.util.js";
import UserModel from "../src/models/user.model.js";
import InterestModel from "../src/models/interest.model.js";
import MembershipPlan from "../src/models/membershipPlan.model.js";
import Business from "../src/models/business.model.js";
import { createTestMongo } from "./helpers.js";

describe("New Endpoints & Features Verification", () => {
  let mongoServer: import("mongodb-memory-server").MongoMemoryServer;
  const testUid = "user_test_endpoints_001";
  let authToken: string;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    authToken = signAccessToken({ uid: testUid, email: "tester@stron.in" });

    await UserModel.create({
      uid: testUid,
      email: "tester@stron.in",
      username: "testuser",
    });
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe("Interests Endpoint: GET /api/interests", () => {
    it("should reject unauthenticated requests", async () => {
      const res = await request(app).get("/api/interests");
      expect(res.status).toBe(401);
    });

    it("should return active interests sorted alphabetically", async () => {
      await InterestModel.create([
        { name: "Running", isActive: true },
        { name: "Yoga", isActive: true },
        { name: "Archery", isActive: false },
        { name: "Boxing", isActive: true },
      ]);

      const res = await request(app)
        .get("/api/interests")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.interests)).toBe(true);

      const names = res.body.interests.map((i: { name: string }) => i.name);
      expect(names).toContain("Boxing");
      expect(names).toContain("Running");
      expect(names).toContain("Yoga");
      expect(names).not.toContain("Archery");
      // Check alphabetical ordering
      expect(names).toEqual([...names].sort());
    });
  });

  describe("Plan Smart-Link Endpoints: /plan/:id & /api/plan/:id", () => {
    it("should render 404 HTML for nonexistent plan on desktop", async () => {
      const res = await request(app)
        .get("/plan/650000000000000000000000")
        .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

      expect(res.status).toBe(200);
      expect(res.text).toContain("STRON Membership Plan");
    });

    it("should render rich OpenGraph HTML for an active plan", async () => {
      const biz = await Business.create({
        ownerId: testUid,
        businessName: "Iron Works Fitness",
        category: "GYM",
        contactNumber: "+919876543210",
        address: "MG Road, Bangalore",
        status: "ACTIVE",
      });

      const plan = await MembershipPlan.create({
        businessId: biz._id,
        name: "Gold Annual Pass",
        price: 15000,
        currency: "INR",
        billingCycle: "YEARLY",
        duration: 12,
        durationUnit: "MONTHS",
        status: "ACTIVE",
      });

      const res = await request(app)
        .get(`/api/plan/${plan._id}`)
        .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Gold Annual Pass");
      expect(res.text).toContain("Iron Works Fitness");
      expect(res.text).toContain("og:title");
      expect(res.text).toContain("stron://plan/");
    });

    it("should redirect Android user-agent with custom intent", async () => {
      const res = await request(app)
        .get("/plan/650000000000000000000001")
        .set("User-Agent", "Mozilla/5.0 (Linux; Android 13; Pixel 7)");

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("intent://plan/650000000000000000000001");
      expect(res.headers.location).toContain("scheme=stron");
    });

    it("should redirect iOS user-agent to App Store", async () => {
      const res = await request(app)
        .get("/plan/650000000000000000000001")
        .set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("apps.apple.com/app/id6776768421");
    });
  });

  describe("Rewards Endpoint: GET /api/stron/rewards", () => {
    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/stron/rewards");
      expect(res.status).toBe(401);
    });

    it("should respond with rewards for authenticated user", async () => {
      const res = await request(app)
        .get("/api/stron/rewards")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.rewards)).toBe(true);
    });
  });
});
