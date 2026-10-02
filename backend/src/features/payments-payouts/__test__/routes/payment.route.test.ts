import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { UserModel } from "@/features/identity-auth/index.js";
import Transaction from "@/features/payments-payouts/models/transaction.model.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("payments-payouts: payment.route", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "payment-route-user";
  let token: string;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    token = signAccessToken({ uid, email: "pay-route@stron.in" });

    await UserModel.create({
      uid,
      email: "pay-route@stron.in",
      username: "PayRouteUser",
    });

    await Transaction.create({
      uid,
      razorpayOrderId: "order_route_001",
      eventKey: "event_route_001",
      receipt: "rcpt_route_001",
      amount: 99900,
      currency: "INR",
      status: "created",
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("GET /api/payment/history rejects unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/payment/history");
    expect(res.status).toBe(401);
  });

  it("GET /api/payment/history returns transactions for authenticated user", async () => {
    const res = await request(app)
      .get("/api/payment/history")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.payments)).toBe(true);
  });

  it("GET /api/payment/history validates limit query with Zod", async () => {
    const res = await request(app)
      .get("/api/payment/history?limit=-10")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("validation_error");
  });

  it("POST /api/payment/refund rejects request with missing razorpayOrderId with 400", async () => {
    const res = await request(app)
      .post("/api/payment/refund")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("POST /api/payment/verify rejects invalid signature with 400", async () => {
    const res = await request(app)
      .post("/api/payment/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({
        razorpayOrderId: "order_route_001",
        razorpayPaymentId: "pay_123",
        razorpaySignature: "wrong_signature",
      });

    expect(res.status).toBe(400);
  });
});
