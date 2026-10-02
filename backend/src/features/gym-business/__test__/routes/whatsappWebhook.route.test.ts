import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import mongoose from "mongoose";
import app from "@/app.js";
import { WhatsappMessage, WebhookEvent } from "@/features/gym-business/index.js";
import { drainQueues } from "@/test-helpers/inMemoryQueue.js";
import { createTestMongo } from "@/test-helpers/helpers.js";
import { createGymTestContext, createTestMember } from "../helpers.js";

const original = {
  verify: process.env.WHATSAPP_VERIFY_TOKEN,
  secret: process.env.WHATSAPP_APP_SECRET,
};

describe("gym-business: whatsapp webhook", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
    process.env.WHATSAPP_VERIFY_TOKEN = "verify-me";
    process.env.WHATSAPP_APP_SECRET = "app-secret";
  });

  afterAll(async () => {
    if (original.verify === undefined) delete process.env.WHATSAPP_VERIFY_TOKEN;
    else process.env.WHATSAPP_VERIFY_TOKEN = original.verify;
    if (original.secret === undefined) delete process.env.WHATSAPP_APP_SECRET;
    else process.env.WHATSAPP_APP_SECRET = original.secret;
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("echoes the hub challenge when the verify token matches", async () => {
    const res = await request(app).get("/api/v1/webhooks/whatsapp").query({
      "hub.mode": "subscribe",
      "hub.verify_token": "verify-me",
      "hub.challenge": "12345",
    });
    expect(res.status).toBe(200);
    expect(res.text).toBe("12345");
  });

  it("rejects a bad signature and upgrades SENT to DELIVERED on a valid webhook", async () => {
    const gym = await createGymTestContext("owner-uid-wa-hook", {
      businessName: "Webhook Gym",
      slug: "webhook-gym",
    });
    const member = await createTestMember(gym.businessId, { phone: "9000000091" });
    await WhatsappMessage.create({
      businessId: gym.businessId,
      memberId: member._id,
      type: "BROADCAST",
      body: "Hello",
      status: "SENT",
      providerMessageId: "wamid.hook-1",
      sentAt: new Date(),
    });

    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: "wamid.hook-1", status: "delivered" }],
              },
            },
          ],
        },
      ],
    };
    const raw = JSON.stringify(payload);

    const denied = await request(app)
      .post("/api/v1/webhooks/whatsapp")
      .set("X-Hub-Signature-256", "sha256=deadbeef")
      .set("Content-Type", "application/json")
      .send(raw);
    expect(denied.status).toBe(403);

    const digest = createHmac("sha256", "app-secret").update(raw).digest("hex");
    const ok = await request(app)
      .post("/api/v1/webhooks/whatsapp")
      .set("X-Hub-Signature-256", `sha256=${digest}`)
      .set("Content-Type", "application/json")
      .send(raw);
    expect(ok.status).toBe(200);

    const stored = await WebhookEvent.findOne({ eventKey: "status:wamid.hook-1:delivered" }).lean();
    expect(stored).toBeTruthy();
    expect(stored?.status).toBe("RECEIVED");

    const beforeDrain = await WhatsappMessage.findOne({ providerMessageId: "wamid.hook-1" }).lean();
    expect(beforeDrain?.status).toBe("SENT");

    await drainQueues();

    const row = await WhatsappMessage.findOne({ providerMessageId: "wamid.hook-1" }).lean();
    expect(row?.status).toBe("DELIVERED");
    const processed = await WebhookEvent.findOne({ eventKey: "status:wamid.hook-1:delivered" }).lean();
    expect(processed?.status).toBe("PROCESSED");
  });

  it("stores inbound messages after the webhook is acknowledged", async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "919000000092",
                    id: "wamid.in-1",
                    type: "text",
                    text: { body: "Hi gym" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const raw = JSON.stringify(payload);
    const digest = createHmac("sha256", "app-secret").update(raw).digest("hex");
    const ok = await request(app)
      .post("/api/v1/webhooks/whatsapp")
      .set("X-Hub-Signature-256", `sha256=${digest}`)
      .set("Content-Type", "application/json")
      .send(raw);
    expect(ok.status).toBe(200);

    await drainQueues();
    const inbound = await WhatsappMessage.findOne({ providerMessageId: "wamid.in-1" }).lean();
    expect(inbound?.direction).toBe("INBOUND");
    expect(inbound?.body).toBe("Hi gym");
  });

  it("does not store a second webhook event for a duplicate delivery", async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "919000000093",
                    id: "wamid.dup-1",
                    type: "text",
                    text: { body: "Ping" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const raw = JSON.stringify(payload);
    const digest = createHmac("sha256", "app-secret").update(raw).digest("hex");
    const headers = {
      "X-Hub-Signature-256": `sha256=${digest}`,
      "Content-Type": "application/json",
    };
    const first = await request(app).post("/api/v1/webhooks/whatsapp").set(headers).send(raw);
    const second = await request(app).post("/api/v1/webhooks/whatsapp").set(headers).send(raw);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await WebhookEvent.countDocuments({ eventKey: "message:wamid.dup-1" })).toBe(1);
  });
});
