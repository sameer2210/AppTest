import type { RequestHandler } from "express";

/**
 * Protects manually triggered HTTP job endpoints.
 * In-process cron jobs do not use this middleware.
 */
export const requireInternalToken: RequestHandler = (req, res, next) => {
  const internalSyncToken = process.env.INTERNAL_SYNC_TOKEN || "";
  if (!internalSyncToken) {
    return res.status(503).json({
      error: "Endpoint disabled: INTERNAL_SYNC_TOKEN is not configured.",
    });
  }

  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!bearerToken || bearerToken !== internalSyncToken) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  return next();
};
