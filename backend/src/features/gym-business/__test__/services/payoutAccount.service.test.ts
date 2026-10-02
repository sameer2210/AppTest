import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import payoutAccountService from "@/features/gym-business/services/payoutAccount.service.js";
import { createTestMongo, type TestObjectId } from "@/test-helpers/helpers.js";
import { createGymTestContext } from "@/features/gym-business/__test__/helpers.js";

describe("gym-business: payoutAccount.service", () => {
  let mongoServer: MongoMemoryServer;
  let businessId: TestObjectId;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    const ctx = await createGymTestContext("owner-payout-svc-001");
    businessId = ctx.businessId;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create payout account, validate PAN, run penny drop, and verify status", async () => {
    const account = await payoutAccountService.createPayoutAccount({
      businessId,
      accountData: {
        accountHolderName: "Iron Gym Pvt Ltd",
        accountNumber: "123456789012",
        ifsc: "HDFC0001234",
        panNumber: "ABCDE1234F",
        bankName: "HDFC Bank",
      },
    });

    expect(account!.maskedAccountNumber).toBe("****9012");
    expect(account!.rawAccountNumber).toBeUndefined();
    expect(account!.panNumber).toBeUndefined();
    expect(account!.verificationStatus).toBe("VERIFIED");
    expect(account!.verifiedAt).toBeDefined();
    expect(account!.providerAccountId).toContain("fav_test_");
  });

  it("should reject invalid PAN format with validation error", async () => {
    await expect(
      payoutAccountService.createPayoutAccount({
        businessId,
        accountData: {
          accountHolderName: "Iron Gym Pvt Ltd",
          accountNumber: "123456789012",
          ifsc: "HDFC0001234",
          panNumber: "INVALID123",
          bankName: "HDFC Bank",
        },
      }),
    ).rejects.toMatchObject({ code: "validation_error" });
  });

  it("should mark status FAILED if bank account details fail penny drop validation", async () => {
    const account = await payoutAccountService.createPayoutAccount({
      businessId,
      accountData: {
        accountHolderName: "Iron Gym Pvt Ltd",
        accountNumber: "123456789012",
        ifsc: "INVALIDIFSC",
        panNumber: "ABCDE1234F",
        bankName: "HDFC Bank",
      },
    });

    expect(account!.verificationStatus).toBe("FAILED");
    expect(account!.verificationMessage).toContain("Invalid IFSC");
  });

  it("should fail closed on payout webhook missing signature with 403", async () => {
    await expect(
      payoutAccountService.handlePayoutWebhook({
        rawBody: "{}",
        signature: undefined,
        eventPayload: { event: "fund_account.validation.completed" },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
