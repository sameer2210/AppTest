import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import businessHomeService from "@/features/gym-business/services/businessHome.service.js";
import { Payment } from "@/features/gym-business/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";
import { createGymTestContext, createTestMember } from "../helpers.js";

describe("gym-business: businessHome.service", () => {
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

  it("returns the home-summary contract with server-formatted earnings and zero placeholders", async () => {
    const ctx = await createGymTestContext("owner-uid-home-summary-001");
    const member = await createTestMember(ctx.businessId);

    await Payment.create({
      businessId: ctx.businessId,
      memberId: member._id,
      amount: 1500,
      finalAmount: 1500,
      currency: "INR",
      method: "CASH",
      source: "MANUAL",
      status: "PENDING",
    });

    const summary = await businessHomeService.getBusinessHomeSummary({
      businessId: ctx.businessId,
      ownerId: ctx.ownerUid,
      business: ctx.business,
    });

    expect(summary.business.businessName).toBe("Iron Core Gym");
    expect(summary.business.slug).toBe("iron-core-gym");
    expect(summary.brandPage.shareUrl).toBe("https://stron.in/gym/iron-core-gym");
    expect(summary.brandPage.visitsToday).toBe(0);
    expect(summary.whatsapp.creditsLeft).toBe(0);
    expect(summary.whatsapp.memberCount).toBe(1);
    expect(summary.earnings.period).toBe("THIS_MONTH");
    expect(summary.earnings.label).toBe("Earnings this Month");
    expect(summary.earnings.currency).toBe("INR");
    expect(summary.earnings.formattedAmount).toMatch(/^₹ /);
    expect(summary.verification.progressPercent).toBeGreaterThan(0);
    expect(summary.hasPro).toBe(false);
    expect(summary.quickActions.map((action) => action.id)).toEqual([
      "add_listing",
      "record_payment",
      "add_plans",
    ]);
    expect(summary.quickActions.find((action) => action.id === "record_payment")?.badgeCount).toBe(1);
  });
});
