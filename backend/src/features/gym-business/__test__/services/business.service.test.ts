import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import businessService from "@/features/gym-business/services/business.service.js";
import { createTestMongo, type TestObjectId } from "@/test-helpers/helpers.js";

describe("gym-business: business.service", () => {
  let mongoServer: MongoMemoryServer;
  const ownerUid = "owner-uid-business-svc-001";
  let businessId: TestObjectId;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a new business profile with phone", async () => {
    const business = await businessService.createBusinessProfile({
      ownerId: ownerUid,
      businessData: {
        businessName: "Iron Core Gym",
        location: "Indiranagar, Bangalore",
        phone: "9876543210",
        services: ["CrossFit", "Zumba"],
      },
    });

    expect(business).toBeDefined();
    expect(business.businessName).toBe("Iron Core Gym");
    expect(business.phone).toBe("9876543210");
    expect(business.status).toBe("ACTIVE");
    businessId = business._id as TestObjectId;
  });

  it("should reject duplicate business creation for the same owner with conflict (409)", async () => {
    await expect(
      businessService.createBusinessProfile({
        ownerId: ownerUid,
        businessData: { businessName: "Second Gym" },
      }),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("should allow updating phone and not allow client to modify status via updateBusinessProfile", async () => {
    const updated = await businessService.updateBusinessProfile({
      businessId,
      updateData: {
        location: "Koramangala, Bangalore",
        phone: "9876500000",
        status: "SUSPENDED",
      },
    });

    expect(updated.location).toBe("Koramangala, Bangalore");
    expect(updated.phone).toBe("9876500000");
    // Status must remain ACTIVE (status update ignored for owner)
    expect(updated.status).toBe("ACTIVE");
  });

  it("should auto-generate a unique slug from the business name on create", async () => {
    const created = await businessService.getBusinessProfile({ businessId });
    expect(created.slug).toBe("iron-core-gym");
  });

  it("should suffix colliding auto-generated slugs", async () => {
    const second = await businessService.createBusinessProfile({
      ownerId: "owner-uid-business-svc-002",
      businessData: { businessName: "Iron Core Gym" },
    });
    expect(second.slug).toBe("iron-core-gym-2");
  });

  it("should reject an explicit slug that is already taken", async () => {
    await expect(
      businessService.createBusinessProfile({
        ownerId: "owner-uid-business-svc-003",
        businessData: { businessName: "Other Gym", slug: "iron-core-gym" },
      }),
    ).rejects.toMatchObject({ code: "slug_taken" });
  });

  it("should persist gallery URLs on update", async () => {
    const galleryUrls = [
      "https://apidev.stron.in/api/upload/public/gym-gallery/one.jpg",
      "https://apidev.stron.in/api/upload/public/gym-gallery/two.jpg",
    ];
    const updated = await businessService.updateBusinessProfile({
      businessId,
      updateData: { galleryUrls },
    });
    expect(updated.galleryUrls).toEqual(galleryUrls);

    const cleared = await businessService.updateBusinessProfile({
      businessId,
      updateData: { galleryUrls: [] },
    });
    expect(cleared.galleryUrls).toEqual([]);
  });

  it("should ignore client-supplied isVerified and status on update", async () => {
    const updated = await businessService.updateBusinessProfile({
      businessId,
      updateData: {
        bio: "Strength gym",
        isVerified: true,
        verificationSource: "ADMIN",
        status: "SUSPENDED",
      },
    });

    expect(updated.bio).toBe("Strength gym");
    expect(updated.isVerified).toBe(false);
    expect(updated.verificationSource).toBeNull();
    expect(updated.status).toBe("ACTIVE");
  });

  it("computeVerification: incomplete profile stays unverified", () => {
    const summary = businessService.computeVerification({
      business: {
        businessName: "Register Your Business",
        location: null,
        phone: null,
        services: [],
        openingHours: [],
        isVerified: false,
      },
      payoutAccount: null,
    });
    expect(summary.isVerified).toBe(false);
    expect(summary.progressPercent).toBe(0);
    expect(summary.badgeLabel).toBe("Unverified Business");
    expect(summary.missing).toEqual(
      expect.arrayContaining(["businessName", "location", "phone", "services", "openingHours", "payoutAccount"]),
    );
  });

  it("computeVerification: full checklist + verified payout is verified", () => {
    const summary = businessService.computeVerification({
      business: {
        businessName: "Iron Core Gym",
        location: "Indiranagar, Bangalore",
        phone: "9876543210",
        services: ["CrossFit"],
        openingHours: [{ day: "MONDAY", isAvailable: true, openTime: "06:00", closeTime: "22:00" }],
        isVerified: false,
      },
      payoutAccount: { isConfigured: true, verificationStatus: "VERIFIED" },
    });
    expect(summary.isVerified).toBe(true);
    expect(summary.progressPercent).toBe(100);
    expect(summary.badgeLabel).toBe("Verified Business");
    expect(summary.missing).toEqual([]);
  });

  it("computeVerification: admin flag verifies even when the checklist is incomplete", () => {
    const summary = businessService.computeVerification({
      business: {
        businessName: "Register Your Business",
        location: null,
        phone: null,
        services: [],
        openingHours: [],
        isVerified: true,
      },
      payoutAccount: { verificationStatus: "PENDING" },
    });
    expect(summary.isVerified).toBe(true);
    expect(summary.badgeLabel).toBe("Verified Business");
    expect(summary.progressPercent).toBeLessThan(100);
  });
});
