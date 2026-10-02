import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import {
  createAndEnqueueReminder,
  processOutgoingJob,
  processReminderJob,
} from "@/features/gym-business/services/reminder.service.js";
import { WhatsappMessage, WhatsappReminder } from "@/features/gym-business/index.js";
import { drainQueues, ensureWhatsappProcessors } from "@/test-helpers/inMemoryQueue.js";
import {
  NoopWhatsappProvider,
  setWhatsappProvider,
  type WhatsappSendResult,
} from "@/services/whatsapp/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";
import { createGymTestContext, createTestMember } from "../helpers.js";

describe("gym-business: reminder.service", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
    ensureWhatsappProcessors();
  });

  afterAll(async () => {
    setWhatsappProvider(new NoopWhatsappProvider());
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("is idempotent for the same reminder key", async () => {
    const gym = await createGymTestContext("owner-uid-wa-idem", {
      businessName: "Idempotent Gym",
      slug: "idempotent-gym",
    });
    const member = await createTestMember(gym.businessId, { phone: "9000000031" });
    const input = {
      businessId: gym.businessId,
      memberId: member._id,
      type: "BROADCAST" as const,
      body: "Closed Sunday",
      idempotencyKey: "BROADCAST:test-batch:member-1",
      scheduledAt: new Date(),
    };
    const first = await createAndEnqueueReminder(input);
    const second = await createAndEnqueueReminder(input);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(await WhatsappReminder.countDocuments({ businessId: gym.businessId })).toBe(1);
    expect(await WhatsappMessage.countDocuments({ businessId: gym.businessId })).toBe(1);
  });

  it("does not retry permanent Graph errors", async () => {
    const gym = await createGymTestContext("owner-uid-wa-perm", {
      businessName: "Permanent Fail Gym",
      slug: "permanent-fail-gym",
    });
    const member = await createTestMember(gym.businessId, { phone: "9000000032" });
    const created = await createAndEnqueueReminder({
      businessId: gym.businessId,
      memberId: member._id,
      type: "BROADCAST",
      body: "Hello",
      idempotencyKey: "BROADCAST:perm:1",
      scheduledAt: new Date(),
    });
    setWhatsappProvider({
      send: async (): Promise<WhatsappSendResult> => ({
        ok: false,
        providerMessageId: null,
        errorCode: "131026",
        errorMessage: "undeliverable",
        retryable: false,
      }),
    });
    await processOutgoingJob({
      messageId: String(created.message?._id),
      reminderId: String(created.reminder?._id),
      to: "919000000032",
      kind: "template",
      body: "Hello",
      template: {
        name: "stron_gym_announcement",
        language: "en",
        components: [],
      },
    });
    const message = await WhatsappMessage.findById(created.message?._id).lean();
    const reminder = await WhatsappReminder.findById(created.reminder?._id).lean();
    expect(message?.status).toBe("FAILED");
    expect(reminder?.status).toBe("FAILED");
  });

  it("retries transient Graph errors then sends", async () => {
    const gym = await createGymTestContext("owner-uid-wa-retry", {
      businessName: "Retry Gym",
      slug: "retry-gym",
    });
    const member = await createTestMember(gym.businessId, { phone: "9000000033" });
    const created = await createAndEnqueueReminder({
      businessId: gym.businessId,
      memberId: member._id,
      type: "BROADCAST",
      body: "Hello",
      idempotencyKey: "BROADCAST:retry:1",
      scheduledAt: new Date(),
    });
    let attempts = 0;
    setWhatsappProvider({
      send: async (): Promise<WhatsappSendResult> => {
        attempts += 1;
        if (attempts < 2) {
          return {
            ok: false,
            providerMessageId: null,
            errorCode: "130429",
            errorMessage: "rate limited",
            retryable: true,
          };
        }
        return { ok: true, providerMessageId: "wamid.retry-1", retryable: false };
      },
    });
    await expect(
      processOutgoingJob({
        messageId: String(created.message?._id),
        reminderId: String(created.reminder?._id),
        to: "919000000033",
        kind: "text",
        body: "Hello",
      }),
    ).rejects.toThrow(/rate limited/);
    await processOutgoingJob({
      messageId: String(created.message?._id),
      reminderId: String(created.reminder?._id),
      to: "919000000033",
      kind: "text",
      body: "Hello",
    });
    const message = await WhatsappMessage.findById(created.message?._id).lean();
    expect(message?.status).toBe("SENT");
    expect(message?.providerMessageId).toBe("wamid.retry-1");
    await drainQueues();
  });

  it("does not send twice when the reminder is already SENDING or SENT", async () => {
    const gym = await createGymTestContext("owner-uid-wa-cas", {
      businessName: "CAS Gym",
      slug: "cas-gym",
    });
    const member = await createTestMember(gym.businessId, { phone: "9000000034" });
    const created = await createAndEnqueueReminder({
      businessId: gym.businessId,
      memberId: member._id,
      type: "BROADCAST",
      body: "Hello",
      idempotencyKey: "BROADCAST:cas:1",
      scheduledAt: new Date(),
    });

    let sends = 0;
    setWhatsappProvider({
      send: async (): Promise<WhatsappSendResult> => {
        sends += 1;
        return { ok: true, providerMessageId: "wamid.cas-1", retryable: false };
      },
    });

    await drainQueues();
    expect(sends).toBe(1);
    expect((await WhatsappReminder.findById(created.reminder?._id).lean())?.status).toBe("SENT");

    await processReminderJob(String(created.reminder?._id));
    await drainQueues();
    expect(sends).toBe(1);

    await WhatsappReminder.updateOne(
      { _id: created.reminder?._id },
      { $set: { status: "SENDING" } },
    );
    await processReminderJob(String(created.reminder?._id));
    await drainQueues();
    expect(sends).toBe(1);
    expect((await WhatsappMessage.findById(created.message?._id).lean())?.providerMessageId).toBe(
      "wamid.cas-1",
    );
  });
});
