import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { UserModel } from "@/features/identity-auth/index.js";
import {
  upsertOrganizer,
  getOrganizer,
} from "@/features/managed-events/services/stronOrganizer.service.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("managed-events: stronOrganizer.service", () => {
  let mongoServer: MongoMemoryServer;
  const verifiedUid = "org-verified-user";
  const unverifiedUid = "org-unverified-user";

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    await UserModel.create([
      {
        uid: verifiedUid,
        email: "verified@org.com",
        username: "VerifiedOrg",
        contactNo: "+919876543210",
        phoneVerified: true,
      },
      {
        uid: unverifiedUid,
        email: "unverified@org.com",
        username: "UnverifiedOrg",
        phoneVerified: false,
      },
    ]);
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("upsertOrganizer rejects unverified phone with organizer_not_verified", async () => {
    await expect(
      upsertOrganizer(unverifiedUid, { fullName: "Test Name" }),
    ).rejects.toMatchObject({ code: "organizer_not_verified" });
  });

  it("upsertOrganizer creates organizer profile for verified phone user", async () => {
    const org = await upsertOrganizer(verifiedUid, { fullName: "Verified Organizer" });
    expect(org).toBeDefined();
    expect(org.fullName).toBe("Verified Organizer");
    expect(org.uid).toBe(verifiedUid);
  });

  it("getOrganizer returns existing profile", async () => {
    const org = await getOrganizer(verifiedUid);
    expect(org.fullName).toBe("Verified Organizer");
  });

  it("getOrganizer throws organizer_not_found for non-existent organizer", async () => {
    await expect(
      getOrganizer("ghost-organizer-uid"),
    ).rejects.toMatchObject({ code: "organizer_not_found" });
  });
});
