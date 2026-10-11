import { afterEach, describe, expect, it } from "vitest";
import { assertDurableWhatsappQueue } from "../adapter.js";

const ENV_KEYS = ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "REDIS_URL", "REDIS_HOST"] as const;

describe("whatsapp queue adapter", () => {
  let snapshot: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  const saveEnv = () => {
    snapshot = {};
    for (const key of ENV_KEYS) snapshot[key] = process.env[key];
  };

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (snapshot[key] === undefined) delete process.env[key];
      else process.env[key] = snapshot[key];
    }
  });

  it("refuses the in-memory queue when Cloud API credentials are set and Redis is unavailable", async () => {
    saveEnv();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    process.env.WHATSAPP_ACCESS_TOKEN = "token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id";

    await expect(assertDurableWhatsappQueue()).rejects.toThrow(/in-memory queue/);
  });

  it("allows the in-memory queue when Cloud API credentials are not set", async () => {
    saveEnv();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;

    await expect(assertDurableWhatsappQueue()).resolves.toBe(false);
  });
});
