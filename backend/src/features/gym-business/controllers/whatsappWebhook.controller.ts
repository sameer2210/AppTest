import type { Request, Response } from "express";
import { getWhatsappVerifyToken } from "../../../constants/infra.constants.js";
import { verifyWhatsappWebhookSignature } from "../../../services/whatsapp/index.js";
import { acceptWhatsappWebhook } from "../services/webhookEvent.service.js";
import { logger } from "../../../utils/logger.util.js";

export const verifyWhatsappWebhook = (req: Request, res: Response) => {
  const mode = String(req.query["hub.mode"] || "");
  const token = String(req.query["hub.verify_token"] || "");
  const challenge = String(req.query["hub.challenge"] || "");
  const expected = getWhatsappVerifyToken();
  if (mode === "subscribe" && expected && token === expected) {
    return res.status(200).type("text/plain").send(challenge);
  }
  return res.status(403).json({ success: false, code: "forbidden", message: "Invalid verify token." });
};

export const handleWhatsappWebhook = async (req: Request, res: Response) => {
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const signature = req.header("x-hub-signature-256") || req.header("X-Hub-Signature-256");
  if (!verifyWhatsappWebhookSignature(rawBody, signature)) {
    return res.status(403).json({ success: false, code: "forbidden", message: "Invalid webhook signature." });
  }
  try {
    await acceptWhatsappWebhook(req.body);
  } catch (error) {
    logger.warn("[whatsapp] webhook enqueue failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
  return res.status(200).json({ success: true });
};

export default {
  verifyWhatsappWebhook,
  handleWhatsappWebhook,
};
