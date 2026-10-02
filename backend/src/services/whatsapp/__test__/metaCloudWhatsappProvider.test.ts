import { afterEach, describe, expect, it, vi } from "vitest";
import { MetaCloudWhatsappProvider } from "../metaCloudWhatsappProvider.js";

const originalFetch = globalThis.fetch;
const original = {
  token: process.env.WHATSAPP_ACCESS_TOKEN,
  phone: process.env.WHATSAPP_PHONE_NUMBER_ID,
  version: process.env.WHATSAPP_API_VERSION,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (original.token === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
  else process.env.WHATSAPP_ACCESS_TOKEN = original.token;
  if (original.phone === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  else process.env.WHATSAPP_PHONE_NUMBER_ID = original.phone;
  if (original.version === undefined) delete process.env.WHATSAPP_API_VERSION;
  else process.env.WHATSAPP_API_VERSION = original.version;
});

describe("MetaCloudWhatsappProvider", () => {
  it("posts a template payload to Graph and returns the wamid", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "wa-token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "pnid-1";
    process.env.WHATSAPP_API_VERSION = "v21.0";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.abc" }] }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const provider = new MetaCloudWhatsappProvider();
    const result = await provider.send({
      to: "919876543210",
      kind: "template",
      body: "Gym closed Sunday",
      template: {
        name: "stron_gym_announcement",
        language: "en",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "Iron Gym" },
              { type: "text", text: "Gym closed Sunday" },
            ],
          },
        ],
      },
    });

    expect(result).toMatchObject({ ok: true, providerMessageId: "wamid.abc" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v21.0/pnid-1/messages");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer wa-token",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      messaging_product: "whatsapp",
      to: "919876543210",
      type: "template",
      template: { name: "stron_gym_announcement" },
    });
  });

  it("maps Graph error codes without throwing", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "wa-token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "pnid-1";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 131026, message: "Receiver is incapable" } }),
    }) as unknown as typeof fetch;

    const result = await new MetaCloudWhatsappProvider().send({
      to: "919876543210",
      kind: "text",
      body: "hello",
    });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("131026");
    expect(result.retryable).toBe(false);
  });

  it("retries HTTP 5xx once and still returns retryable if Graph stays down", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "wa-token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "pnid-1";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { code: 2, message: "Service Unavailable" } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: { code: 2, message: "Service Unavailable" } }),
      });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await new MetaCloudWhatsappProvider().send({
      to: "919876543210",
      kind: "text",
      body: "hello",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
    expect(result.retryable).toBe(true);
  });
});
