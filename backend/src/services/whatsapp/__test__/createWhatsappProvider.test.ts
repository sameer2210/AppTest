import { afterEach, describe, expect, it } from "vitest";
import { createWhatsappProvider } from "../createWhatsappProvider.js";
import { MetaCloudWhatsappProvider } from "../metaCloudWhatsappProvider.js";
import { NoopWhatsappProvider } from "../whatsappProvider.js";

const original = {
  token: process.env.WHATSAPP_ACCESS_TOKEN,
  phone: process.env.WHATSAPP_PHONE_NUMBER_ID,
};

afterEach(() => {
  if (original.token === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
  else process.env.WHATSAPP_ACCESS_TOKEN = original.token;
  if (original.phone === undefined) delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  else process.env.WHATSAPP_PHONE_NUMBER_ID = original.phone;
});

describe("createWhatsappProvider", () => {
  it("returns Noop when credentials are missing", () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    expect(createWhatsappProvider()).toBeInstanceOf(NoopWhatsappProvider);
  });

  it("returns Meta Cloud provider when token and phone number id are set", () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
    expect(createWhatsappProvider()).toBeInstanceOf(MetaCloudWhatsappProvider);
  });
});
