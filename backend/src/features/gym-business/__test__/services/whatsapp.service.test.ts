import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import whatsappService from "@/features/gym-business/services/whatsapp.service.js";
import { Payment, ProSubscription, WhatsappMessage, WhatsappWallet } from "@/features/gym-business/index.js";
import paymentService from "@/features/gym-business/services/payment.service.js";
import { drainQueues } from "@/test-helpers/inMemoryQueue.js";
import { createTestMongo, type TestObjectId } from "@/test-helpers/helpers.js";
import { createGymTestContext, createTestMember } from "../helpers.js";

const enablePro = async (businessId: TestObjectId) => {
  await ProSubscription.create({
    businessId,
    planCode: "STRON_PRO",
    status: "ACTIVE",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
};

describe("gym-business: whatsapp.service", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("seeds reminder configs once and previews recipients per type", async () => {
    const gym = await createGymTestContext("owner-uid-wa-seed", {
      businessName: "Whatsapp Seed Gym",
      slug: "whatsapp-seed-gym",
    });
    const member = await createTestMember(gym.businessId, { phone: "9000000001" });

    const first = await whatsappService.listReminderConfigs({ businessId: gym.businessId });
    const second = await whatsappService.listReminderConfigs({ businessId: gym.businessId });
    expect(first.map((row) => row.type).sort()).toEqual([
      "AUTOPAY_FAILED",
      "MANUAL_PAYMENT",
      "PAYMENT_RECEIPT",
    ]);
    expect(second).toHaveLength(3);

    await Payment.create({
      businessId: gym.businessId,
      memberId: member._id,
      amount: 500,
      finalAmount: 500,
      method: "CASH",
      source: "MANUAL",
      status: "PENDING",
    });

    const queued = await whatsappService.previewRecipients({
      businessId: gym.businessId,
      type: "MANUAL_PAYMENT",
    });
    expect(queued.count).toBe(1);
    expect(queued.members[0].id).toBe(String(member._id));

    const updated = await whatsappService.updateReminderConfig({
      businessId: gym.businessId,
      type: "MANUAL_PAYMENT",
      patch: { isActive: true, audience: "QUEUE_TOP_N", audienceLimit: 1, dayOffsets: [-3, 0] },
    });
    expect(updated.isActive).toBe(true);
    expect(updated.targetLabel).toBe("Top 1 in queue");
  });

  it("blocks broadcast without entitlement and cannot overdraw credits concurrently", async () => {
    const gym = await createGymTestContext("owner-uid-wa-debit", {
      businessName: "Whatsapp Debit Gym",
      slug: "whatsapp-debit-gym",
    });
    const a = await createTestMember(gym.businessId, { phone: "9000000011" });
    const b = await createTestMember(gym.businessId, { phone: "9000000012" });
    const c = await createTestMember(gym.businessId, { phone: "9000000013" });

    await expect(
      whatsappService.sendBroadcast({
        businessId: gym.businessId,
        memberIds: [a._id],
        message: "Hello",
      }),
    ).rejects.toMatchObject({ code: "whatsapp_not_entitled" });

    await enablePro(gym.businessId);
    await whatsappService.creditWallet({
      businessId: gym.businessId,
      amount: 5,
      reason: "TEST_TOPUP",
    });

    const [one, two] = await Promise.allSettled([
      whatsappService.sendBroadcast({
        businessId: gym.businessId,
        memberIds: [a._id, b._id, c._id],
        message: "Batch A",
      }),
      whatsappService.sendBroadcast({
        businessId: gym.businessId,
        memberIds: [a._id, b._id, c._id],
        message: "Batch B",
      }),
    ]);

    const fulfilled = [one, two].filter((result) => result.status === "fulfilled");
    const rejected = [one, two].filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      code: "insufficient_whatsapp_credits",
    });

    const wallet = await WhatsappWallet.findOne({ businessId: gym.businessId }).lean();
    expect(wallet?.balance).toBe(2);

    const view = await whatsappService.getWallet({ businessId: gym.businessId });
    expect(view.creditsLeft).toBe(2);
    expect(view.hasEntitlement).toBe(true);
    expect(view.memberCount).toBe(3);
  });

  it("marks invalid phones FAILED without refunding credits", async () => {
    const gym = await createGymTestContext("owner-uid-wa-phone", {
      businessName: "Whatsapp Phone Gym",
      slug: "whatsapp-phone-gym",
    });
    const member = await createTestMember(gym.businessId, { phone: "1234567890" });
    await enablePro(gym.businessId);
    await whatsappService.creditWallet({
      businessId: gym.businessId,
      amount: 1,
      reason: "TEST_TOPUP",
    });

    const result = await whatsappService.sendBroadcast({
      businessId: gym.businessId,
      memberIds: [member._id],
      message: "Hello",
    });
    expect(result.queued).toBe(1);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);

    const wallet = await WhatsappWallet.findOne({ businessId: gym.businessId }).lean();
    expect(wallet?.balance).toBe(0);
    const row = await WhatsappMessage.findOne({ businessId: gym.businessId }).lean();
    expect(row?.status).toBe("FAILED");
    expect(row?.failureReason).toBe("invalid_phone");
  });

  it("queues a payment receipt after a successful manual payment", async () => {
    const gym = await createGymTestContext("owner-uid-wa-receipt", {
      businessName: "Whatsapp Receipt Gym",
      slug: "whatsapp-receipt-gym",
    });
    const member = await createTestMember(gym.businessId, { phone: "9000000088" });
    await enablePro(gym.businessId);
    await whatsappService.creditWallet({
      businessId: gym.businessId,
      amount: 2,
      reason: "TEST_TOPUP",
    });
    await whatsappService.updateReminderConfig({
      businessId: gym.businessId,
      type: "PAYMENT_RECEIPT",
      patch: { isActive: true },
    });

    await paymentService.recordManualPayment({
      businessId: gym.businessId,
      recordedBy: "owner-uid-wa-receipt",
      paymentData: {
        memberId: member._id,
        amount: 500,
        finalAmount: 500,
        method: "CASH",
      },
    });

    await drainQueues();
    const row = await WhatsappMessage.findOne({
      businessId: gym.businessId,
      type: "PAYMENT_RECEIPT",
    }).lean();
    expect(row).toBeTruthy();
    expect(["QUEUED", "SENT"]).toContain(row?.status);
  });
});
