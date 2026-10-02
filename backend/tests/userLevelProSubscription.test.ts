import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../src/app.js";
import { signAccessToken } from "../src/utils/jwt.util.js";
import proSubscriptionService from "../src/services/proSubscription.service.js";
import entitlementService from "../src/services/entitlement.service.js";
import businessService from "../src/services/business.service.js";
import UserModel from "../src/models/user.model.js";
import ProSubscription from "../src/models/proSubscription.model.js";
import Business from "../src/models/business.model.js";

describe("User-Level STRON PRO Subscriptions (No Business Profile Required)", () => {
  let mongoServer: MongoMemoryServer;
  const individualUid = "user-uid-individual-001";
  let token: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create user with age > 7 days
    await UserModel.create({
      uid: individualUid,
      email: "runner@stron.app",
      username: "ProRunner",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });

    token = signAccessToken({ uid: individualUid, email: "runner@stron.app" });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("1. should allow non-business user to check trial eligibility (eligible after 7 days)", async () => {
    const res = await request(app)
      .get("/api/v1/pro/trial/eligibility")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isEligible).toBe(true);
    expect(res.body.data.reason).toBeUndefined();
    expect(res.body.data.daysOnPlatform).toBeGreaterThanOrEqual(7);
  });

  it("2. should return FREE snapshot for non-business user who has not purchased PRO", async () => {
    const res = await request(app)
      .get("/api/v1/pro")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPro).toBe(false);
    expect(res.body.data.planCode).toBe("FREE");
  });

  it("3. should allow non-business user to sync RevenueCat purchase and become PRO", async () => {
    // Mock RevenueCat subscriber response
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          subscriber: {
            entitlements: {
              "Stron Pro Premium Plan": {
                expires_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                period_type: "NORMAL",
              },
            },
          },
        }),
      })),
    );

    const res = await request(app)
      .post("/api/v1/pro/sync-revenuecat")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPro).toBe(true);

    // Verify in database that ProSubscription is saved with userId and null businessId
    const savedSub = await ProSubscription.findOne({ userId: individualUid }).lean();
    expect(savedSub).toBeDefined();
    expect(savedSub?.userId).toBe(individualUid);
    expect(savedSub?.businessId).toBeNull();
    expect(savedSub?.status).toBe("ACTIVE");

    // Verify GET /api/v1/pro returns isPro: true
    const getRes = await request(app)
      .get("/api/v1/pro")
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.isPro).toBe(true);
    expect(getRes.body.data.daysRemaining).toBeGreaterThan(0);
  });

  it("4. should allow non-business user to pause and resume their STRON PRO subscription", async () => {
    const pauseRes = await request(app)
      .post("/api/v1/pro/pause")
      .set("Authorization", `Bearer ${token}`)
      .send({ pauseDays: 14 });

    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.success).toBe(true);
    expect(pauseRes.body.data.subscription.status).toBe("PAUSED");

    const resumeRes = await request(app)
      .post("/api/v1/pro/resume")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.success).toBe(true);
    expect(resumeRes.body.data.subscription.status).toBe("ACTIVE");
  });

  it("5. should allow non-business user to cancel auto-renew on STRON PRO", async () => {
    const cancelRes = await request(app)
      .post("/api/v1/pro/cancel")
      .set("Authorization", `Bearer ${token}`)
      .send({ cancelReason: "Test cancellation" });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.subscription.autoRenew).toBe(false);
  });

  it("6. should inherit PRO entitlements (0% fee) if the PRO user later creates a gym profile", async () => {
    const biz = await businessService.createBusinessProfile({
      ownerId: individualUid,
      businessData: {
        businessName: "Runner Fitness Club",
        location: "Delhi, India",
        phone: "9123456789",
      },
    });

    const entitlements = await entitlementService.getBusinessEntitlements({
      businessId: biz._id,
      userId: individualUid,
    });
    expect(entitlements.isPro).toBe(true);
    expect(entitlements.tier).toBe("PRO");

    const feeConfig = await entitlementService.getPlatformFeeConfig({
      businessId: biz._id,
      userId: individualUid,
    });
    expect(feeConfig.tier).toBe("PRO");
    expect(feeConfig.platformFeePercentage).toBe(0);
  });

  it("7. should process RevenueCat webhook for user without a gym", async () => {
    const webhookUserUid = "individual-user-webhook-002";
    await UserModel.create({
      uid: webhookUserUid,
      email: "webhookuser@stron.app",
      username: "WebhookUser",
    });

    const result = await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: "Bearer rc_webhook_test_token",
      eventPayload: {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: webhookUserUid,
          period_type: "NORMAL",
          expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
      },
    });

    expect(result.received).toBe(true);
    expect(result.eventType).toBe("INITIAL_PURCHASE");

    const userSub = await ProSubscription.findOne({ userId: webhookUserUid }).lean();
    expect(userSub).toBeDefined();
    expect(userSub?.userId).toBe(webhookUserUid);
    expect(userSub?.status).toBe("ACTIVE");
  });
});
