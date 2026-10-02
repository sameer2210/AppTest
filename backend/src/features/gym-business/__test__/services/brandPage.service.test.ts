import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import brandPageService from "@/features/gym-business/services/brandPage.service.js";
import { getISTDateString } from "@/features/gym-business/services/attendance.service.js";
import { BrandPageVisit, Business } from "@/features/gym-business/index.js";
import { StronEvent } from "@/features/managed-events/index.js";
import { createTestMongo, type TestObjectId } from "@/test-helpers/helpers.js";
import { createGymTestContext, createTestPlan } from "../helpers.js";

describe("gym-business: brandPage.service", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    process.env.PUBLIC_WEB_BASE_URL = "https://stron.in";
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("returns ACTIVE plans only and hides suspended gyms", async () => {
    const ctx = await createGymTestContext("owner-uid-brand-svc-001", {
      businessName: "Brand Alpha Gym",
      slug: "brand-alpha-gym",
    });
    await createTestPlan(ctx.businessId, { name: "Live Monthly", price: 1500, duration: 1, billingCycle: "MONTHLY" });
    await createTestPlan(ctx.businessId, {
      name: "Draft Hidden",
      price: 999,
      duration: 1,
      billingCycle: "MONTHLY",
      status: "DRAFT",
    });

    await StronEvent.create({
      key: "brand-svc-live-marathon",
      organizerUid: ctx.ownerUid,
      format: "marathon",
      title: "Sunday Marathon",
      description: "Walk 2k steps",
      destination: "New Delhi",
      status: "published",
    });
    await StronEvent.create({
      key: "brand-svc-draft-hidden",
      organizerUid: ctx.ownerUid,
      format: "face_off",
      title: "Hidden Draft",
      status: "draft",
    });

    const page = await brandPageService.getPublicBrandPage({ slug: "brand-alpha-gym" });
    expect(page.business.businessName).toBe("Brand Alpha Gym");
    expect(page.business).not.toHaveProperty("ownerId");
    expect(page.business).not.toHaveProperty("phone");
    expect(page.plans.map((plan) => plan.name)).toEqual(["Live Monthly"]);
    expect(page.events.map((event) => event.title)).toEqual(["Sunday Marathon"]);
    expect(page.categories).toContain("Events");

    await createTestPlan(ctx.businessId, { name: "Members Pack", visibility: "MEMBERS_ONLY" });
    await createTestPlan(ctx.businessId, { name: "Private Invite", visibility: "PRIVATE" });
    const filtered = await brandPageService.getPublicBrandPage({ slug: "brand-alpha-gym" });
    expect(filtered.plans.map((plan) => plan.name)).toEqual(["Live Monthly"]);

    await Business.updateOne({ _id: ctx.businessId }, { $set: { status: "SUSPENDED" } });
    await expect(
      brandPageService.getPublicBrandPage({ slug: "brand-alpha-gym" }),
    ).rejects.toMatchObject({ code: "brand_page_not_found" });
  });

  it("upserts visits per IST day and treats visitorHash as idempotent", async () => {
    const ctx = await createGymTestContext("owner-uid-brand-svc-002", {
      businessName: "Brand Beta Gym",
      slug: "brand-beta-gym",
    });
    const slug = "brand-beta-gym";

    const first = await brandPageService.recordVisit({ slug, visitorHash: "visitor-aaa" });
    const second = await brandPageService.recordVisit({ slug, visitorHash: "visitor-aaa" });
    const third = await brandPageService.recordVisit({ slug, visitorHash: "visitor-bbb" });
    const anonymous = await brandPageService.recordVisit({ slug });

    expect(first.visitsToday).toBe(1);
    expect(second.visitsToday).toBe(1);
    expect(third.visitsToday).toBe(2);
    expect(anonymous.visitsToday).toBe(3);

    const today = getISTDateString();
    const yesterday = getISTDateString(new Date(Date.now() - 36 * 60 * 60 * 1000));
    expect(yesterday).not.toBe(today);

    await BrandPageVisit.create({
      businessId: ctx.businessId,
      dateIST: yesterday,
      count: 5,
    });

    const stats = await brandPageService.getVisitStats({ businessId: ctx.businessId });
    expect(stats.visitsToday).toBe(3);
    expect(stats.visitsLast7Days).toBe(8);
    expect(stats.visitsTotal).toBe(8);

    const ownerPage = await brandPageService.getOwnerBrandPage({
      businessId: ctx.businessId,
      business: ctx.business,
    });
    expect(ownerPage.shareUrl).toBe("https://stron.in/gym/brand-beta-gym");
    expect(ownerPage.stats.visitsToday).toBe(3);
  });
});
