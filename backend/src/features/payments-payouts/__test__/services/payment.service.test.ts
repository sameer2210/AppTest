import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import {
  getPaymentHistoryService,
  verifyPaymentService,
} from "@/features/payments-payouts/services/eventPayment.service.js";
import Transaction from "@/features/payments-payouts/models/transaction.model.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("payments-payouts: eventPayment.service", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "payment-svc-user";

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    await Transaction.create({
      uid,
      razorpayOrderId: "order_test_123",
      eventKey: "event_001",
      receipt: "rcpt_001",
      amount: 49900,
      currency: "INR",
      status: "created",
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("getPaymentHistoryService returns transactions for user", async () => {
    const history = await getPaymentHistoryService({ uid });
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(1);
    expect(history[0].razorpayOrderId).toBe("order_test_123");
  });

  it("getPaymentHistoryService rejects missing uid with unauthorized", async () => {
    await expect(
      getPaymentHistoryService({ uid: "" }),
    ).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("verifyPaymentService rejects invalid signature with bad_request", async () => {
    await expect(
      verifyPaymentService({
        uid,
        razorpayOrderId: "order_test_123",
        razorpayPaymentId: "pay_test_123",
        razorpaySignature: "invalid_sig",
      }),
    ).rejects.toMatchObject({ code: "bad_request" });
  });
});
