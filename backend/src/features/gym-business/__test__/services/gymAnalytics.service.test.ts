import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import gymAnalyticsService from "@/features/gym-business/services/gymAnalytics.service.js";
import membershipPlanService from "@/features/gym-business/services/membershipPlan.service.js";
import memberService from "@/features/gym-business/services/member.service.js";
import attendanceService, { getISTDateString } from "@/features/gym-business/services/attendance.service.js";
import { Payment } from "@/features/gym-business/index.js";
import { createTestMongo, type TestObjectId } from "@/test-helpers/helpers.js";
import { createGymTestContext, seedBrandPageAnalytics } from "@/features/gym-business/__test__/helpers.js";

describe("gym-business: gymAnalytics.service", () => {
  let mongoServer: MongoMemoryServer;
  let businessId: TestObjectId;
  const ownerUid = "owner-analytics-svc-001";

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    const ctx = await createGymTestContext(ownerUid);
    businessId = ctx.businessId;

    await membershipPlanService.createPlan({
      businessId,
      planData: {
        name: "Quarterly Pro",
        price: 3000,
        billingCycle: "QUARTERLY",
        duration: 3,
        durationUnit: "MONTHS",
      },
    });

    const member = await memberService.createMember({
      businessId,
      memberData: {
        name: "Virat Kohli",
        phone: "+919999988888",
        gender: "MALE",
      },
    });

    await Payment.create({
      businessId,
      memberId: member._id,
      amount: 2400,
      finalAmount: 2400,
      currency: "INR",
      method: "ONLINE",
      source: "GATEWAY",
      status: "SUCCESS",
      paidAt: new Date(),
    });

    await attendanceService.recordAttendance({
      businessId,
      markedBy: ownerUid,
      attendanceData: {
        memberId: member._id,
        attendanceDate: getISTDateString(),
        source: "QR",
      },
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should compute real-time dashboard summary metrics", async () => {
    const dashboard = await gymAnalyticsService.getDashboardSummary({ businessId });

    expect(dashboard.totalMembers).toBe(1);
    expect(dashboard.todayAttendance).toBe(1);
    expect(dashboard.visitsThisMonth).toBeGreaterThanOrEqual(1);
    expect(dashboard.monthlyRevenue).toBe(2400);
    expect(dashboard.monthlyTransactions).toBe(1);
    expect(dashboard.paymentMethods).toBeDefined();
    expect(dashboard.paymentMethods.upiPercent).toBe(100);
    expect(dashboard.paymentMethods.otherPercent).toBe(0);
    expect(dashboard.brandPageVisitsThisMonth).toBe(0);
    expect(dashboard.weeklyRevenue).toHaveLength(4);
    expect(dashboard.weeklyRevenue.reduce((sum: number, row: { value: number }) => sum + row.value, 0)).toBe(
      dashboard.monthlyRevenue,
    );
    expect(dashboard.brandPage.visits).toBe(0);
    expect(dashboard.brandPage.freeTrialPercent).toBe(0);
    expect(dashboard.brandPage.purchaseAttemptPercent).toBe(0);
    expect(dashboard.brandPage.offerClaimRatePercent).toBe(0);
  });

  it("should compute business-scoped listing analytics from real plans", async () => {
    const listingData = await gymAnalyticsService.getListingAnalytics({ businessId });

    expect(listingData.conversionRate).toBeDefined();
    expect(listingData.repeatUserRate).toBeDefined();
    expect(listingData.conversionRate.listings).toBeInstanceOf(Array);
    expect(listingData.conversionRate.listings.length).toBeGreaterThan(0);
    expect(listingData.conversionRate.listings[0].title).toContain("Quarterly Pro");
    expect(listingData.summary).toBeDefined();
    expect(listingData.summary.listingCount).toBe(0);
    expect(listingData.summary.totalCustomers).toBe(0);
  });

  it("computes brand page funnel from seeded visits, trials, payments, and coupons", async () => {
    const ctx = await createGymTestContext("owner-brand-analytics-001");
    const seeded = await seedBrandPageAnalytics({ businessId: ctx.businessId });
    const brand = await gymAnalyticsService.getBrandPageAnalytics({
      businessId: ctx.businessId,
    });

    expect(brand.visits).toBe(seeded.visits);
    expect(brand.freeTrialCount).toBe(seeded.trialMembers);
    expect(brand.purchaseAttemptCount).toBe(seeded.purchaseAttempts);
    expect(brand.offerClaimCount).toBe(seeded.offerClaims);
    expect(brand.freeTrialPercent).toBe(Math.round((seeded.trialMembers / seeded.visits) * 100));
    expect(brand.purchaseAttemptPercent).toBe(
      Math.round((seeded.purchaseAttempts / seeded.visits) * 100),
    );
    expect(brand.offerClaimRatePercent).toBe(Math.round((seeded.offerClaims / seeded.visits) * 100));
    expect(brand.people.trials.length).toBeGreaterThan(0);
    expect(brand.people.purchases.length).toBe(seeded.purchaseAttempts);
    expect(brand.people.claims.length).toBe(seeded.offerClaims);
    expect(brand.people.trials.some((row: { name: string }) => row.name === "Trial User")).toBe(true);
    expect(brand.people.visits.every((row: { name: string }) => !/^Visitor/i.test(row.name))).toBe(true);
    expect(brand.dailyVisits.length).toBeGreaterThan(0);
    expect(brand.people.purchases.every((row: { status?: string }) =>
      row.status === "Completed" || row.status === "Abandoned",
    )).toBe(true);
    expect(brand.visitsVsLastMonthPercent === null || typeof brand.visitsVsLastMonthPercent === "number").toBe(
      true,
    );
  });
});
