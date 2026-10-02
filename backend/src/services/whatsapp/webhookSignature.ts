import { createHmac, timingSafeEqual } from "node:crypto";
import { getWhatsappAppSecret } from "../../constants/infra.constants.js";

export const verifyWhatsappWebhookSignature = (
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
): boolean => {
  const secret = getWhatsappAppSecret();
  if (!secret) return false;
  const header = String(signatureHeader || "");
  const provided = header.startsWith("sha256=") ? header.slice(7) : header;
  if (!provided) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};
