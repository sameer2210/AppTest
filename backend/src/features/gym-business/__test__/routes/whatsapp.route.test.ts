import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import mongoose from "mongoose";
import app from "@/app.js";
import { ProSubscription } from "@/features/gym-business/index.js";
import whatsappService from "@/features/gym-business/services/whatsapp.service.js";
import { createTestMongo } from "@/test-helpers/helpers.js";
import { createGymTestContext, createTestMember } from "../helpers.js";

describe("gym-business: whatsapp.route", () => {
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

  it("returns the wallet and seeded reminders, and broadcasts after PRO + credits", async () => {
    const ctx = await createGymTestContext("owner-uid-wa-http", {
      businessName: "Whatsapp Http Gym",
      slug: "whatsapp-http-gym",
    });
    const member = await createTestMember(ctx.businessId, { phone: "9000000099" });
    const auth = { Authorization: `Bearer ${ctx.token}` };

    const wallet = await request(app).get("/api/v1/whatsapp/wallet").set(auth);
    expect(wallet.status).toBe(200);
    expect(wallet.body.data.creditsLeft).toBe(0);
    expect(wallet.body.data.hasEntitlement).toBe(false);

    const reminders = await request(app).get("/api/v1/whatsapp/reminders").set(auth);
    expect(reminders.status).toBe(200);
    expect(reminders.body.data).toHaveLength(3);

    const blocked = await request(app)
      .post("/api/v1/whatsapp/broadcast")
      .set(auth)
      .send({ memberIds: [String(member._id)], message: "Closed Sunday" });
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("whatsapp_not_entitled");

    await ProSubscription.create({
      businessId: ctx.businessId,
      planCode: "STRON_PRO",
      status: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });
    await whatsappService.creditWallet({
      businessId: ctx.businessId,
      amount: 10,
      reason: "TEST_TOPUP",
    });

    const sent = await request(app)
      .post("/api/v1/whatsapp/broadcast")
      .set(auth)
      .send({ memberIds: [String(member._id)], message: "Closed Sunday" });
    expect(sent.status).toBe(200);
    expect(sent.body.data.queued).toBe(1);
    expect(sent.body.data.sent).toBe(0);
    expect(sent.body.data.failed).toBe(0);
    expect(sent.body.data.creditsLeft).toBe(9);

    const home = await request(app).get("/api/v1/business/home-summary").set(auth);
    expect(home.status).toBe(200);
    expect(home.body.data.whatsapp.creditsLeft).toBe(9);
  });
});
