import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "@/app.js";
import businessService from "@/features/gym-business/services/business.service.js";
import proSubscriptionService from "@/features/gym-business/services/proSubscription.service.js";
import entitlementService from "@/features/gym-business/services/entitlement.service.js";
import { ProSubscription } from "@/features/gym-business/index.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { asProSubscription, createTestMongo, type TestObjectId, type TestToken } from "@/test-helpers/helpers.js";
import { createGymTestContext } from "@/features/gym-business/__test__/helpers.js";

describe("gym-business: proSubscription.service", () => {
  let mongoServer: MongoMemoryServer;
  let businessId: TestObjectId;
  let token: TestToken;
  const ownerUid = "owner-pro-svc-001";

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    const ctx = await createGymTestContext(ownerUid);
    businessId = ctx.businessId;
    token = ctx.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should return Free tier platform fee config (5%)", async () => {
    const feeConfig = await entitlementService.getPlatformFeeConfig({ businessId });
    expect(feeConfig.tier).toBe("FREE");
    expect(feeConfig.platformFeePercentage).toBe(5);
  });

  it("should upgrade to PRO and configure 0% platform fee", async () => {
    await ProSubscription.create({
      businessId,
      planCode: "STRON_PRO",
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      price: 999,
      currency: "INR",
      startedAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const proFeeConfig = await entitlementService.getPlatformFeeConfig({ businessId });
    expect(proFeeConfig.tier).toBe("PRO");
    expect(proFeeConfig.platformFeePercentage).toBe(0);

    const subscription = asProSubscription(await proSubscriptionService.getSubscription({ businessId }));
    expect(subscription.isPro).toBe(true);
    expect(subscription.daysRemaining).toBeGreaterThan(0);
    expect(subscription.renewalText).toMatch(/renews in \d+ days?/);

    const entitlements = await entitlementService.getBusinessEntitlements({ businessId });
    expect(entitlements.daysRemaining).toBeGreaterThan(0);
    expect(entitlements.renewalText).toMatch(/renews in \d+ days?/);

    const hasAnalytics = await entitlementService.hasFeature({
      businessId,
      featureName: "ADVANCED_ANALYTICS",
    });
    expect(hasAnalytics).toBe(true);
  });

  it("should pause PRO as an in-app hold without changing store period or autoRenew", async () => {
    const before = await ProSubscription.findOne({ businessId }).lean();
    const periodEndBefore = new Date(before!.currentPeriodEnd!).getTime();
    const autoRenewBefore = before!.autoRenew;

    const pauseRes = await proSubscriptionService.pauseSubscription({
      businessId,
      pauseDays: 14,
    });

    expect(pauseRes.subscription.status).toBe("PAUSED");
    expect(pauseRes.subscription.isPaused).toBe(true);
    expect(pauseRes.subscription.resumeAt).toBeDefined();
    expect(new Date(pauseRes.subscription.currentPeriodEnd!).getTime()).toBe(periodEndBefore);
    expect(pauseRes.subscription.autoRenew).toBe(autoRenewBefore);

    const currentSub = asProSubscription(await proSubscriptionService.getSubscription({ businessId }));
    expect(currentSub.status).toBe("PAUSED");
    expect(currentSub.isPro).toBe(true);

    const entitlements = await entitlementService.getBusinessEntitlements({ businessId });
    expect(entitlements.isPro).toBe(true);
    expect(entitlements.tier).toBe("PRO");
    expect(entitlements.subscriptionStatus).toBe("PAUSED");

    const feeConfig = await entitlementService.getPlatformFeeConfig({ businessId });
    expect(feeConfig.platformFeePercentage).toBe(0);

    const hasAnalytics = await entitlementService.hasFeature({
      businessId,
      featureName: "ADVANCED_ANALYTICS",
    });
    expect(hasAnalytics).toBe(true);
  });

  it("should resume a paused PRO subscription", async () => {
    const resumeRes = await proSubscriptionService.resumeSubscription({ businessId });
    expect(resumeRes.subscription.status).toBe("ACTIVE");
    expect(resumeRes.subscription.isPaused).toBe(false);

    const currentSub = asProSubscription(await proSubscriptionService.getSubscription({ businessId }));
    expect(currentSub.status).toBe("ACTIVE");
    expect(currentSub.isPro).toBe(true);
  });

  it("should reject YEARLY billingCycle on subscribe", async () => {
    const res = await request(app)
      .post("/api/v1/pro/subscribe")
      .set("Authorization", `Bearer ${token}`)
      .send({ billingCycle: "YEARLY" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("validation_error");
  });

  it("should map webhook app_user_id to gym businessId", async () => {
    const rcUid = "rc-map-owner-001";
    await UserModel.create({ uid: rcUid, email: "rcmap@test.com", username: "rcmap" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "RC Map Gym" },
    });
    const result = await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: "Bearer rc_webhook_test_token",
      eventPayload: {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: rcUid,
          expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
      },
    });
    expect(result.eventType).toBe("INITIAL_PURCHASE");
    expect(String(result.businessId)).toBe(String(biz._id));
    const sub = await ProSubscription.findOne({ businessId: biz._id }).lean();
    expect(sub!.status).toBe("ACTIVE");
    expect(sub!.billingCycle).toBe("MONTHLY");
    expect(sub!.autoRenew).toBe(true);
    expect(sub!.gateway).toBe("revenuecat");
  });

  it("should mark STRON PRO as TRIAL from RevenueCat period_type TRIAL", async () => {
    const rcUid = "rc-store-trial-001";
    await UserModel.create({ uid: rcUid, email: "rctrial@test.com", username: "rctrial" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "RC Store Trial Gym" },
    });
    const trialEnd = Date.now() + 14 * 24 * 60 * 60 * 1000;
    await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: "Bearer rc_webhook_test_token",
      eventPayload: {
        event: {
          type: "INITIAL_PURCHASE",
          period_type: "TRIAL",
          app_user_id: rcUid,
          expiration_at_ms: trialEnd,
        },
      },
    });
    const sub = await ProSubscription.findOne({ businessId: biz._id }).lean();
    expect(sub!.status).toBe("TRIAL");
    expect(sub!.price).toBe(0);
    expect(sub!.gateway).toBe("revenuecat");
    const user = await UserModel.findOne({ uid: rcUid }).lean();
    expect(user!.hasAvailedProTrial).toBe(true);
    const current = asProSubscription(await proSubscriptionService.getSubscription({ businessId: biz._id }));
    expect(current.isPro).toBe(true);
    expect(current.status).toBe("TRIAL");
    const fee = await entitlementService.getPlatformFeeConfig({ businessId: biz._id });
    expect(fee.platformFeePercentage).toBe(0);
  });

  it("should sync a store trial entitlement as TRIAL not a backend free grant", async () => {
    const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          subscriber: {
            entitlements: {
              stron_pro: {
                expires_date: expires,
                period_type: "trial",
                product_identifier: "stron_pro:monthly",
              },
            },
          },
        }),
      })),
    );
    const rcUid = "rc-sync-trial-001";
    await UserModel.create({ uid: rcUid, email: "synctrial@test.com", username: "synctrial" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "Sync Trial Gym" },
    });
    const data = asProSubscription(await proSubscriptionService.syncRevenueCatPurchase({
      businessId: biz._id,
      userUid: rcUid,
    }));
    expect(data.isPro).toBe(true);
    expect(data.status).toBe("TRIAL");
    expect(data.price).toBe(0);
  });

  it("should not persist Firebase uid as businessId when owner has no gym", async () => {
    const result = await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: "Bearer rc_webhook_test_token",
      eventPayload: {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: "ghost-uid-no-gym",
          expiration_at_ms: Date.now() + 86400000,
        },
      },
    });
    expect(result.warning).toBeDefined();
    expect(result.businessId).toBeUndefined();
  });

  it("should ignore unknown entitlement on sync", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          subscriber: {
            entitlements: {
              warrior_pass: { expires_date: new Date(Date.now() + 86400000).toISOString() },
            },
          },
        }),
      })),
    );
    const rcUid = "rc-sync-noent-001";
    await UserModel.create({ uid: rcUid, email: "noent@test.com", username: "noent" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "No Ent Gym" },
    });
    const data = asProSubscription(await proSubscriptionService.syncRevenueCatPurchase({
      businessId: biz._id,
      userUid: rcUid,
    }));
    expect(data.isPro).toBe(false);
  });

  it("should activate MONTHLY PRO from configured entitlement on sync", async () => {
    const expires = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          subscriber: {
            entitlements: {
              stron_pro: {
                expires_date: expires,
                product_identifier: "stron_pro:monthly",
              },
            },
          },
        }),
      })),
    );
    const rcUid = "rc-sync-ent-001";
    await UserModel.create({ uid: rcUid, email: "ent@test.com", username: "entuser" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "Ent Gym" },
    });
    const data = asProSubscription(await proSubscriptionService.syncRevenueCatPurchase({
      businessId: biz._id,
      userUid: rcUid,
    }));
    expect(data.isPro).toBe(true);
    expect(data.status).toBe("ACTIVE");
    expect(data.billingCycle).toBe("MONTHLY");
    expect(data.price).toBe(999);
  });

  it("should keep ACTIVE and clear autoRenew on CANCELLATION webhook", async () => {
    const rcUid = "rc-cancel-owner-001";
    await UserModel.create({ uid: rcUid, email: "rccancel@test.com", username: "rccancel" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "RC Cancel Gym" },
    });
    await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: "Bearer rc_webhook_test_token",
      eventPayload: {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: rcUid,
          expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
      },
    });
    await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: "Bearer rc_webhook_test_token",
      eventPayload: {
        event: { type: "CANCELLATION", app_user_id: rcUid },
      },
    });
    const sub = await ProSubscription.findOne({ businessId: biz._id }).lean();
    expect(sub!.status).toBe("ACTIVE");
    expect(sub!.autoRenew).toBe(false);
  });

  it("should expire ACTIVE PRO and return isPro false after EXPIRATION webhook", async () => {
    const rcUid = "rc-expire-owner-001";
    await UserModel.create({ uid: rcUid, email: "rcexp@test.com", username: "rcexp" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "RC Expire Gym" },
    });
    await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: "Bearer rc_webhook_test_token",
      eventPayload: {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: rcUid,
          expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
      },
    });
    await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: "Bearer rc_webhook_test_token",
      eventPayload: {
        event: { type: "EXPIRATION", app_user_id: rcUid },
      },
    });
    const sub = await ProSubscription.findOne({ businessId: biz._id }).lean();
    expect(sub!.status).toBe("EXPIRED");
    const current = asProSubscription(await proSubscriptionService.getSubscription({ businessId: biz._id }));
    expect(current.isPro).toBe(false);
  });

  it("should expire lapsed ACTIVE PRO on getSubscription when webhook is late", async () => {
    const rcUid = "rc-lapse-owner-001";
    await UserModel.create({ uid: rcUid, email: "rclapse@test.com", username: "rclapse" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "RC Lapse Gym" },
    });
    await ProSubscription.create({
      businessId: biz._id,
      planCode: "STRON_PRO",
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      price: 999,
      currency: "INR",
      gateway: "revenuecat",
      currentPeriodEnd: new Date(Date.now() - 60 * 1000),
    });
    const current = asProSubscription(await proSubscriptionService.getSubscription({ businessId: biz._id }));
    expect(current.isPro).toBe(false);
    const fee = await entitlementService.getPlatformFeeConfig({ businessId: biz._id });
    expect(fee.platformFeePercentage).toBe(5);
    const stored = await ProSubscription.findOne({ businessId: biz._id }).lean();
    expect(stored!.status).toBe("EXPIRED");
  });

  it("should keep in-app pause through RENEWAL webhook and still treat gym as Pro", async () => {
    const rcUid = "rc-pause-renew-001";
    await UserModel.create({ uid: rcUid, email: "rcpause@test.com", username: "rcpause" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "RC Pause Renew Gym" },
    });
    const originalEnd = Date.now() + 10 * 24 * 60 * 60 * 1000;
    await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: "Bearer rc_webhook_test_token",
      eventPayload: {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: rcUid,
          expiration_at_ms: originalEnd,
        },
      },
    });
    await proSubscriptionService.pauseSubscription({ businessId: biz._id, pauseDays: 14 });

    const renewedEnd = Date.now() + 40 * 24 * 60 * 60 * 1000;
    await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: "Bearer rc_webhook_test_token",
      eventPayload: {
        event: {
          type: "RENEWAL",
          app_user_id: rcUid,
          expiration_at_ms: renewedEnd,
        },
      },
    });

    const sub = await ProSubscription.findOne({ businessId: biz._id }).lean();
    expect(sub!.status).toBe("PAUSED");
    expect(sub!.isPaused).toBe(true);
    expect(new Date(sub!.currentPeriodEnd!).getTime()).toBe(renewedEnd);

    const current = asProSubscription(await proSubscriptionService.getSubscription({ businessId: biz._id }));
    expect(current.status).toBe("PAUSED");
    expect(current.isPro).toBe(true);
    const fee = await entitlementService.getPlatformFeeConfig({ businessId: biz._id });
    expect(fee.platformFeePercentage).toBe(0);
  });

  it("should clear in-app pause on a new INITIAL_PURCHASE", async () => {
    const rcUid = "rc-pause-rebuy-001";
    await UserModel.create({ uid: rcUid, email: "rcrebuy@test.com", username: "rcrebuy" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "RC Pause Rebuy Gym" },
    });
    await ProSubscription.create({
      businessId: biz._id,
      planCode: "STRON_PRO",
      status: "PAUSED",
      isPaused: true,
      pausedAt: new Date(),
      resumeAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      billingCycle: "MONTHLY",
      price: 999,
      currency: "INR",
      gateway: "revenuecat",
      currentPeriodEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });
    const newEnd = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: "Bearer rc_webhook_test_token",
      eventPayload: {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: rcUid,
          expiration_at_ms: newEnd,
        },
      },
    });
    const sub = await ProSubscription.findOne({ businessId: biz._id }).lean();
    expect(sub!.status).toBe("ACTIVE");
    expect(sub!.isPaused).toBe(false);
    expect(sub!.resumeAt).toBeNull();
  });

  it("should keep in-app pause on RevenueCat sync while store entitlement is valid", async () => {
    const expires = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          subscriber: {
            entitlements: {
              stron_pro: {
                expires_date: expires,
                product_identifier: "stron_pro:monthly",
              },
            },
          },
        }),
      })),
    );
    const rcUid = "rc-pause-sync-001";
    await UserModel.create({ uid: rcUid, email: "pausesync@test.com", username: "pausesync" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "Pause Sync Gym" },
    });
    await ProSubscription.create({
      businessId: biz._id,
      planCode: "STRON_PRO",
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      price: 999,
      currency: "INR",
      gateway: "revenuecat",
      autoRenew: true,
      currentPeriodEnd: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
    });
    await proSubscriptionService.pauseSubscription({ businessId: biz._id, pauseDays: 14 });

    const data = asProSubscription(await proSubscriptionService.syncRevenueCatPurchase({
      businessId: biz._id,
      userUid: rcUid,
    }));
    expect(data.isPro).toBe(true);
    expect(data.status).toBe("PAUSED");
    expect(new Date(data.currentPeriodEnd!).toISOString()).toBe(expires);
  });

  it("should expire a paused PRO when the store period has already ended", async () => {
    const rcUid = "rc-pause-lapse-001";
    await UserModel.create({ uid: rcUid, email: "pauselapse@test.com", username: "pauselapse" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "Pause Lapse Gym" },
    });
    await ProSubscription.create({
      businessId: biz._id,
      planCode: "STRON_PRO",
      status: "PAUSED",
      isPaused: true,
      pausedAt: new Date(),
      resumeAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      billingCycle: "MONTHLY",
      price: 999,
      currency: "INR",
      gateway: "revenuecat",
      currentPeriodEnd: new Date(Date.now() - 60 * 1000),
    });
    const current = asProSubscription(await proSubscriptionService.getSubscription({ businessId: biz._id }));
    expect(current.isPro).toBe(false);
    const fee = await entitlementService.getPlatformFeeConfig({ businessId: biz._id });
    expect(fee.platformFeePercentage).toBe(5);
    const stored = await ProSubscription.findOne({ businessId: biz._id }).lean();
    expect(stored!.status).toBe("EXPIRED");
  });

  it("should auto-resume an in-app pause after resumeAt on get and via nightly job", async () => {
    const rcUid = "rc-pause-due-001";
    await UserModel.create({ uid: rcUid, email: "pausedue@test.com", username: "pausedue" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "Pause Due Gym" },
    });
    await ProSubscription.create({
      businessId: biz._id,
      planCode: "STRON_PRO",
      status: "PAUSED",
      isPaused: true,
      pausedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      resumeAt: new Date(Date.now() - 60 * 1000),
      billingCycle: "MONTHLY",
      price: 999,
      currency: "INR",
      gateway: "revenuecat",
      autoRenew: true,
      currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    });
    const current = asProSubscription(await proSubscriptionService.getSubscription({ businessId: biz._id }));
    expect(current.status).toBe("ACTIVE");
    expect(current.isPro).toBe(true);
    expect(current.isPaused).toBe(false);

    const cronUid = `${rcUid}-cron`;
    await UserModel.create({ uid: cronUid, email: "pausecron@test.com", username: "pausecron" });
    const cronBiz = await businessService.createBusinessProfile({
      ownerId: cronUid,
      businessData: { businessName: "Pause Cron Gym" },
    });
    await ProSubscription.create({
      businessId: cronBiz._id,
      planCode: "STRON_PRO",
      status: "PAUSED",
      isPaused: true,
      pausedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      resumeAt: new Date(Date.now() - 120 * 1000),
      billingCycle: "MONTHLY",
      price: 999,
      currency: "INR",
      gateway: "revenuecat",
      currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    });
    const cronResult = await proSubscriptionService.resumeDuePausedProSubscriptions();
    expect(cronResult.resumedCount).toBeGreaterThan(0);
    const cronSub = await ProSubscription.findOne({ businessId: cronBiz._id }).lean();
    expect(cronSub!.status).toBe("ACTIVE");
    expect(cronSub!.isPaused).toBe(false);
  });

  it("should expire paused PRO on sync when RevenueCat has no live entitlement", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          subscriber: {
            entitlements: {
              warrior_pass: { expires_date: new Date(Date.now() + 86400000).toISOString() },
            },
          },
        }),
      })),
    );
    const rcUid = "rc-pause-noent-001";
    await UserModel.create({ uid: rcUid, email: "pausenoent@test.com", username: "pausenoent" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "Pause No Ent Gym" },
    });
    await ProSubscription.create({
      businessId: biz._id,
      planCode: "STRON_PRO",
      status: "PAUSED",
      isPaused: true,
      pausedAt: new Date(),
      resumeAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      billingCycle: "MONTHLY",
      price: 999,
      currency: "INR",
      gateway: "revenuecat",
      currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });
    const data = asProSubscription(await proSubscriptionService.syncRevenueCatPurchase({
      businessId: biz._id,
      userUid: rcUid,
    }));
    expect(data.isPro).toBe(false);
    const stored = await ProSubscription.findOne({ businessId: biz._id }).lean();
    expect(stored!.status).toBe("EXPIRED");
  });

  it("should activate MONTHLY PRO on sync when entitlement has no expires_date", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          subscriber: {
            entitlements: {
              stron_pro: {
                product_identifier: "stron_pro:monthly",
              },
            },
          },
        }),
      })),
    );
    const rcUid = "rc-sync-noexp-001";
    await UserModel.create({ uid: rcUid, email: "noexp@test.com", username: "noexp" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "No Exp Gym" },
    });
    const data = asProSubscription(await proSubscriptionService.syncRevenueCatPurchase({
      businessId: biz._id,
      userUid: rcUid,
    }));
    expect(data.isPro).toBe(true);
    expect(data.status).toBe("ACTIVE");
    expect(new Date(data.currentPeriodEnd!).getTime()).toBeGreaterThan(Date.now());
  });

  it("should reject RevenueCat webhook without a valid Bearer token", async () => {
    const missing = await request(app).post("/api/v1/pro/webhook/revenuecat").send({
      event: { type: "INITIAL_PURCHASE", app_user_id: "x" },
    });
    expect(missing.status).toBe(403);
    const invalid = await request(app)
      .post("/api/v1/pro/webhook/revenuecat")
      .set("Authorization", "Bearer wrong-token")
      .send({ event: { type: "INITIAL_PURCHASE", app_user_id: "x" } });
    expect(invalid.status).toBe(403);
  });

  it("should resolve a RevenueCat webhook when app_user_id is the Mongo _id", async () => {
    const rcUid = "rc-mongo-id-001";
    const user = await UserModel.create({ uid: rcUid, email: "mongorc@test.com", username: "mongorc" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "Mongo RC Gym" },
    });
    const result = await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: "Bearer rc_webhook_test_token",
      eventPayload: {
        event: {
          type: "INITIAL_PURCHASE",
          app_user_id: String(user._id),
          expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
      },
    });
    expect(String(result.businessId)).toBe(String(biz._id));
    expect(result.userId).toBe(rcUid);
    const storedUser = await UserModel.findById(user._id).lean();
    expect(storedUser!.hasPurchasedPro).toBe(true);
    expect(storedUser!.revenueCatAppUserId).toBe(String(user._id));
  });

  it("should keep ACTIVE PRO when RevenueCat cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const rcUid = "rc-keep-active-001";
    await UserModel.create({ uid: rcUid, email: "keep@test.com", username: "keepactive" });
    const biz = await businessService.createBusinessProfile({
      ownerId: rcUid,
      businessData: { businessName: "Keep Active Gym" },
    });
    await ProSubscription.create({
      businessId: biz._id,
      userId: rcUid,
      planCode: "STRON_PRO",
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      price: 999,
      currency: "INR",
      gateway: "revenuecat",
      currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    });

    await expect(
      proSubscriptionService.syncRevenueCatPurchase({
        businessId: biz._id,
        userUid: rcUid,
      }),
    ).rejects.toMatchObject({ code: "bad_request" });

    const stored = await ProSubscription.findOne({ businessId: biz._id }).lean();
    expect(stored!.status).toBe("ACTIVE");
  });

  it("should reject STRON PRO Razorpay order and verify in the service", async () => {
    await expect(proSubscriptionService.createProRazorpayOrder()).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(proSubscriptionService.verifyProRazorpayPayment()).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
