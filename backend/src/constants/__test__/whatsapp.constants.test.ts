import { describe, expect, it } from "vitest";
import { defaultTemplateName } from "@/constants/whatsapp.constants.js";
import { getWhatsappTemplateName } from "@/constants/infra.constants.js";

describe("whatsapp template mapping", () => {
  it("maps gym reminder types and day offsets to catalog names", () => {
    expect(defaultTemplateName("PAYMENT_RECEIPT")).toBe("stron_payment_receipt");
    expect(defaultTemplateName("BROADCAST")).toBe("stron_gym_announcement");
    expect(defaultTemplateName("MANUAL_PAYMENT", -3)).toBe("stron_manual_payment_3d");
    expect(defaultTemplateName("MANUAL_PAYMENT", -1)).toBe("stron_manual_payment_1d");
    expect(defaultTemplateName("MANUAL_PAYMENT", 0)).toBe("stron_manual_payment_due");
    expect(defaultTemplateName("AUTOPAY_FAILED", 0)).toBe("stron_autopay_failed_d0");
    expect(defaultTemplateName("AUTOPAY_FAILED", 1)).toBe("stron_autopay_failed_d1");
    expect(defaultTemplateName("AUTOPAY_FAILED", 3)).toBe("stron_autopay_failed_d3");
  });

  it("uses the same constant names from getWhatsappTemplateName", () => {
    expect(getWhatsappTemplateName("MANUAL_PAYMENT", 0)).toBe("stron_manual_payment_due");
    expect(getWhatsappTemplateName("AUTOPAY_FAILED", 1)).toBe("stron_autopay_failed_d1");
  });
});
