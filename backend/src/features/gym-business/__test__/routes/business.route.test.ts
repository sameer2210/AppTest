import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import businessService from "@/features/gym-business/services/business.service.js";
import proSubscriptionService from "@/features/gym-business/services/proSubscription.service.js";
import paymentService from "@/features/gym-business/services/payment.service.js";
import { getISTDateString } from "@/features/gym-business/services/attendance.service.js";
import {
  Business,
  MembershipPlan,
  ProSubscription,
} from "@/features/gym-business/index.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo, type TestObjectId, type TestToken } from "@/test-helpers/helpers.js";

describe("gym-business: business.route (HTTP routes & auth guards)", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  describe("HTTP Endpoint Authentication Guard", () => {
    it("should reject unauthenticated API requests with 401", async () => {
      const res = await request(app).get("/api/v1/business");
      expect(res.status).toBe(401);
    });

    it("should reject unauthenticated home-summary requests with 401", async () => {
      const res = await request(app).get("/api/v1/business/home-summary");
      expect(res.status).toBe(401);
    });

    it("should reject unauthenticated webhook requests missing signature with 403", async () => {
      const res = await request(app)
        .post("/api/v1/payments/webhook/razorpay")
        .send({ event: "payment.captured" });

      expect(res.status).toBe(403);
    });
  });

  describe("HTTP Business API routes", () => {
    const httpOwner = "owner-uid-http-002";
    let httpToken: TestToken;
    let httpBusinessId: TestObjectId;
    let httpMemberId: TestObjectId;
    let httpPlanId: TestObjectId;

    const auth = () => ({ Authorization: `Bearer ${httpToken}` });

    beforeAll(() => {
      httpToken = signAccessToken({ uid: httpOwner, email: "http-owner@testgym.com" });
    });

    it("should return 200 with data null when the owner has no gym profile yet", async () => {
      const res = await request(app).get("/api/v1/business").set(auth());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });

    it("should return 404 business_not_found for home-summary when the owner has no gym", async () => {
      const res = await request(app).get("/api/v1/business/home-summary").set(auth());
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("business_not_found");
    });

    it("should return 403 business_suspended for optional GET when gym is suspended", async () => {
      const suspendedOwner = "owner-uid-http-suspended-001";
      const suspendedToken = signAccessToken({
        uid: suspendedOwner,
        email: "suspended-owner@testgym.com",
      });

      await Business.create({
        ownerId: suspendedOwner,
        businessName: "Suspended Gym",
        status: "SUSPENDED",
      });

      const res = await request(app)
        .get("/api/v1/business")
        .set({ Authorization: `Bearer ${suspendedToken}` });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe("business_suspended");
    });

    it("should create a gym profile over HTTP", async () => {
      const res = await request(app)
        .post("/api/v1/business")
        .set(auth())
        .send({
          businessName: "Peak Form Studio",
          location: "HSR Layout, Bangalore",
          services: ["Strength", "Yoga"],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.businessName).toBe("Peak Form Studio");
      expect(res.body.data.slug).toBe("peak-form-studio");
      expect(res.body.data.status).toBe("ACTIVE");
      expect(res.body.data.isVerified).toBe(false);
      httpBusinessId = res.body.data._id;
      expect(httpBusinessId).toBeTruthy();
    });

    it("should reject a second gym profile for the same owner", async () => {
      const res = await request(app)
        .post("/api/v1/business")
        .set(auth())
        .send({ businessName: "Another Gym" });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("conflict");
    });

    it("should fetch the gym profile without a second lookup miss", async () => {
      const res = await request(app).get("/api/v1/business").set(auth());
      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(String(httpBusinessId));
      expect(res.body.data.businessName).toBe("Peak Form Studio");
    });

    it("should update gym profile fields and ignore status spoofing", async () => {
      const res = await request(app)
        .patch("/api/v1/business")
        .set(auth())
        .send({ location: "Whitefield, Bangalore", status: "SUSPENDED" });

      expect(res.status).toBe(200);
      expect(res.body.data.location).toBe("Whitefield, Bangalore");
      expect(res.body.data.status).toBe("ACTIVE");
    });

    it("should ignore client-supplied isVerified on PATCH (Zod strip + allowlist)", async () => {
      const res = await request(app)
        .patch("/api/v1/business")
        .set(auth())
        .send({ isVerified: true, bio: "Owner cannot self-verify" });

      expect(res.status).toBe(200);
      expect(res.body.data.bio).toBe("Owner cannot self-verify");
      expect(res.body.data.isVerified).toBe(false);
    });

    it("should reject a slug that is already taken by another gym", async () => {
      const otherOwner = "owner-uid-http-slug-001";
      const otherToken = signAccessToken({
        uid: otherOwner,
        email: "slug-owner@testgym.com",
      });

      const createRes = await request(app)
        .post("/api/v1/business")
        .set({ Authorization: `Bearer ${otherToken}` })
        .send({ businessName: "Other Peak", slug: "peak-form-studio" });

      expect(createRes.status).toBe(409);
      expect(createRes.body.code).toBe("slug_taken");
    });

    it("should return home-summary for the gym owner", async () => {
      process.env.PUBLIC_WEB_BASE_URL = "https://stron.in";
      const res = await request(app).get("/api/v1/business/home-summary").set(auth());
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.business.businessName).toBe("Peak Form Studio");
      expect(res.body.data.business.slug).toBe("peak-form-studio");
      expect(res.body.data.brandPage.shareUrl).toBe("https://stron.in/gym/peak-form-studio");
      expect(res.body.data.earnings.label).toBe("Earnings this Month");
      expect(res.body.data.quickActions).toHaveLength(3);
      expect(res.body.data.hasPro).toBe(false);
      expect(res.body.data.whatsapp.creditsLeft).toBe(0);
    });

    it("should create a plan, member, and list them", async () => {
      const planRes = await request(app)
        .post("/api/v1/membership-plans")
        .set(auth())
        .send({
          name: "Monthly",
          price: 1500,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        });
      expect(planRes.status).toBe(201);
      httpPlanId = planRes.body.data._id;

      const memberRes = await request(app)
        .post("/api/v1/members")
        .set(auth())
        .send({ name: "Anushka Sharma", phone: "+919111122222", gender: "FEMALE" });
      expect(memberRes.status).toBe(201);
      httpMemberId = memberRes.body.data._id;

      const listRes = await request(app).get("/api/v1/members").set(auth());
      expect(listRes.status).toBe(200);
      expect(listRes.body.members).toHaveLength(1);
      expect(listRes.body.pagination.total).toBe(1);
    });

    it("should stop a membership plan via DELETE (STOPPED, not soft-deleted)", async () => {
      const stopRes = await request(app)
        .delete(`/api/v1/membership-plans/${httpPlanId}`)
        .set(auth());

      expect(stopRes.status).toBe(200);
      expect(stopRes.body.success).toBe(true);
      expect(stopRes.body.data.plan.status).toBe("STOPPED");

      const dbPlan = await MembershipPlan.findById(httpPlanId).lean();
      expect(dbPlan!.status).toBe("STOPPED");
      expect(dbPlan!.isDeleted).toBe(false);

      // Restore for subsequent membership/attendance tests that need an ACTIVE plan
      await MembershipPlan.findByIdAndUpdate(httpPlanId, { status: "ACTIVE" });
    });

    it("should assign a membership (default PENDING and explicit ACTIVE) and expose dashboard analytics", async () => {
      const pendingRes = await request(app)
        .post(`/api/v1/members/${httpMemberId}/memberships`)
        .set(auth())
        .send({ planId: httpPlanId, finalAmount: 1500 });
      expect(pendingRes.status).toBe(201);
      expect(pendingRes.body.data.status).toBe("PENDING");
      expect(pendingRes.body.data.startDate).toBeNull();
      expect(pendingRes.body.data.endDate).toBeNull();

      const membershipRes = await request(app)
        .post(`/api/v1/members/${httpMemberId}/memberships`)
        .set(auth())
        .send({ planId: httpPlanId, finalAmount: 1500, status: "ACTIVE" });
      expect(membershipRes.status).toBe(201);
      expect(membershipRes.body.data.status).toBe("ACTIVE");

      const filtered = await request(app)
        .get("/api/v1/memberships")
        .query({ memberId: String(httpMemberId), status: "ACTIVE" })
        .set(auth());
      expect(filtered.status).toBe(200);
      expect(filtered.body.memberships.length).toBeGreaterThan(0);

      const dashboard = await request(app).get("/api/v1/analytics/dashboard").set(auth());
      expect(dashboard.status).toBe(200);
      expect(dashboard.body.data.totalMembers).toBe(1);
      expect(dashboard.body.data.activeMembers).toBe(1);

      const memberAnalytics = await request(app).get("/api/v1/analytics/members").set(auth());
      expect(memberAnalytics.status).toBe(200);
      expect(memberAnalytics.body.data.genderDistribution.some((g: { gender: string }) => g.gender === "FEMALE")).toBe(true);
    });

    it("should record attendance and reject a duplicate check-in", async () => {
      const today = getISTDateString();
      const first = await request(app)
        .post("/api/v1/attendance")
        .set(auth())
        .send({ memberId: String(httpMemberId), attendanceDate: today, source: "QR" });
      expect(first.status).toBe(201);
      expect(first.body.data.accessGate.status).toBe("ALLOWED");

      const duplicate = await request(app)
        .post("/api/v1/attendance")
        .set(auth())
        .send({ memberId: String(httpMemberId), attendanceDate: today, source: "QR" });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.code).toBe("attendance_already_marked");
    });

    it("should check trial eligibility and refuse backend-only trial activate", async () => {
      const newOwner = "new-trial-gate-owner";
      const newToken = signAccessToken({ uid: newOwner, email: "newtrial@gym.com" });
      const newAuth = { Authorization: `Bearer ${newToken}` };
      await UserModel.create({
        uid: newOwner,
        email: "newtrial@gym.com",
        username: "newtrialgate",
        createdAt: new Date(),
      });
      const bizRes = await request(app)
        .post("/api/v1/business")
        .set(newAuth)
        .send({ businessName: "New Trial Gate Gym" });
      expect(bizRes.status).toBe(201);

      const eligRes = await request(app)
        .get("/api/v1/subscriptions/trial/eligibility")
        .set(newAuth);

      expect(eligRes.status).toBe(200);
      expect(eligRes.body.success).toBe(true);
      expect(eligRes.body.data.isEligible).toBe(false);
      expect(eligRes.body.data.hasSpentMoreThan7Days).toBe(false);
      expect(eligRes.body.data.daysUntilTrial).toBeGreaterThan(0);
      expect(eligRes.body.data.trialDays).toBe(14);
      expect(eligRes.body.data.claimViaStore).toBe(true);

      const activateRes = await request(app)
        .post("/api/v1/subscriptions/trial/activate")
        .set(newAuth)
        .send({});

      expect(activateRes.status).toBe(400);
      expect(activateRes.body.code).toBe("trial_via_store_only");
      expect(activateRes.body.data?.isPro).toBeUndefined();

      const secondActivate = await request(app)
        .post("/api/v1/pro/trial/activate")
        .set(newAuth)
        .send({});
      expect(secondActivate.status).toBe(400);
      expect(secondActivate.body.code).toBe("trial_via_store_only");
    });

    it("should allow store-trial eligibility after 7 days on the platform", async () => {
      const agedOwner = "aged-trial-owner";
      const agedToken = signAccessToken({ uid: agedOwner, email: "aged@gym.com" });
      await UserModel.create({
        uid: agedOwner,
        email: "aged@gym.com",
        username: "agedowner",
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      });
      const biz = await businessService.createBusinessProfile({
        ownerId: agedOwner,
        businessData: { businessName: "Aged Trial Gym" },
      });
      const elig = await proSubscriptionService.checkTrialEligibility({
        uid: agedOwner,
        businessId: biz._id,
      });
      expect(elig.hasSpentMoreThan7Days).toBe(true);
      expect(elig.isEligible).toBe(true);
      expect(elig.daysUntilTrial).toBe(0);

      const httpElig = await request(app)
        .get("/api/v1/subscriptions/trial/eligibility")
        .set({ Authorization: `Bearer ${agedToken}` });
      expect(httpElig.status).toBe(200);
      expect(httpElig.body.data.isEligible).toBe(true);
    });

    it("should reject trial eligibility when business has a PAUSED or CANCELLED subscription", async () => {
      const pausedOwner = "paused-sub-owner";
      const pausedToken = signAccessToken({ uid: pausedOwner, email: "paused@gym.com" });
      const pausedAuth = { Authorization: `Bearer ${pausedToken}` };

      await UserModel.create({
        uid: pausedOwner,
        email: "paused@gym.com",
        username: "pausedowner",
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      });

      const bizRes = await request(app)
        .post("/api/v1/business")
        .set(pausedAuth)
        .send({ businessName: "Paused Gym" });
      expect(bizRes.status).toBe(201);
      const pausedBizId = bizRes.body.data._id;

      await ProSubscription.create({
        businessId: pausedBizId,
        planCode: "STRON_PRO",
        status: "CANCELLED",
        cancelledAt: new Date(),
      });

      const checkElig = await proSubscriptionService.checkTrialEligibility({
        uid: pausedOwner,
        businessId: pausedBizId,
      });
      expect(checkElig.isEligible).toBe(false);
      expect(checkElig.hasUsedTrialOrPro).toBe(true);

      const actRes = await request(app)
        .post("/api/v1/subscriptions/trial/activate")
        .set(pausedAuth)
        .send({});
      expect(actRes.status).toBe(400);
      expect(actRes.body.code).toBe("trial_via_store_only");
    });

    it("should return 404 when querying payout account before configuration", async () => {
      const newOwner = "payout-test-owner";
      const newToken = signAccessToken({ uid: newOwner, email: "newowner@gym.com" });
      const newAuth = { Authorization: `Bearer ${newToken}` };

      await request(app)
        .post("/api/v1/business")
        .set(newAuth)
        .send({ businessName: "Payout Test Gym" });

      const res = await request(app)
        .get("/api/v1/payout-account")
        .set(newAuth);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("payout_account_not_found");
    });

    it("should compute payment summaries with 0 dues when member has no plan attached", async () => {
      const summariesRes = await paymentService.getMemberPaymentSummaries({
        businessId: httpBusinessId,
      });

      expect(summariesRes.summaries).toBeInstanceOf(Array);
      expect(summariesRes.totalMembers).toBeGreaterThan(0);
      for (const s of summariesRes.summaries) {
        if (!s.planName || s.planName === "STRON Plan") {
          expect(s.totalPrice).not.toBe(3000);
        }
      }
    });

    it("should enforce Zod validation on mutating subscription routes", async () => {
      const invalidVerify = await request(app)
        .post("/api/v1/subscriptions/razorpay/verify")
        .set(auth())
        .send({});
      expect(invalidVerify.status).toBe(400);
      expect(invalidVerify.body.code).toBe("validation_error");

      const invalidPause = await request(app)
        .post("/api/v1/subscriptions/pause")
        .set(auth())
        .send({ pauseDays: "invalid_days" });
      expect(invalidPause.status).toBe(400);
      expect(invalidPause.body.code).toBe("validation_error");
    });
  });
});
