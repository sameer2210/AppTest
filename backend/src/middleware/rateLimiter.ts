import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import jwt from "jsonwebtoken";
import type { Request } from "express";

const getUidFromAuthHeader = (req: Request): string | null => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const decoded = jwt.decode(token);
    if (typeof decoded !== "object" || decoded === null) return null;
    const uid = decoded.uid;
    if (typeof uid === "string" && uid.trim().length > 0) {
      return uid.trim();
    }
  } catch {
    // ignore malformed JWT prefix
  }

  return null;
};

/**
 * Prefer per-user keys so mobile users behind carrier NAT/CGNAT are not
 * blocked together. Fall back to the request IP for unauthenticated traffic.
 */
const getRateLimitKey = (req: Request): string => {
  const uid =
    req.auth?.uid ||
    getUidFromAuthHeader(req) ||
    req.params?.uid ||
    req.params?.userId ||
    (req.body as { uid?: string; userId?: string; phone?: string } | undefined)
      ?.uid ||
    (req.body as { uid?: string; userId?: string; phone?: string } | undefined)
      ?.userId ||
    (req.body as { uid?: string; userId?: string; phone?: string } | undefined)
      ?.phone ||
    (req.query as { userId?: string; uid?: string }).userId ||
    (req.query as { userId?: string; uid?: string }).uid;

  if (typeof uid === "string" && uid.trim().length > 0) {
    return `user:${uid.trim()}`;
  }

  return ipKeyGenerator(req.ip || req.socket?.remoteAddress || "unknown");
};

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
} as const;

export const globalLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: "Too many requests, please try again in a few minutes",
});

export const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 5 * 60 * 1000,
  max: 20,
  message:
    "Too many authentication attempts, please try again after 5 minutes",
});

export const actionLimiter = rateLimit({
  ...baseOptions,
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: "You are performing too many actions, please try again in a minute.",
});

export const stepSyncLimiter = rateLimit({
  ...baseOptions,
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: "Step sync is too frequent, please try again in a moment.",
});

export const adminActionLimiter = rateLimit({
  ...baseOptions,
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: "Too many admin actions, please try again later.",
});

/** Light cap on unauthenticated Brand Page reads / visit posts. */
export const publicBrandLimiter = rateLimit({
  ...baseOptions,
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10_000 : 60,
  message: "Too many brand page requests, please try again in a minute.",
});

/** Light cap on unauthenticated WhatsApp Cloud API webhooks. */
export const publicWhatsappWebhookLimiter = rateLimit({
  ...baseOptions,
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 10_000 : 120,
  message: "Too many WhatsApp webhook requests, please try again in a minute.",
});
