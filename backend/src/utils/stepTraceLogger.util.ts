/**
 * Structured step-tracking trace logger.
 * Every line is a single-line JSON object prefixed with [STEP_TRACE] so it can be
 * grepped out of `pm2 logs` independently of normal request/morgan logs:
 *   pm2 logs stron-dev | grep STEP_TRACE
 *
 * Toggle with STEP_TRACE_LOGGING=false in .env (defaults to on).
 */
import type { ServiceParams } from "../types/service.util.js";

const ENABLED = process.env.STEP_TRACE_LOGGING !== "false";

/** Pull uid/email/phone out of whatever shape (Mongoose doc, plain object, req.user) is on hand. */
const identity = (user: unknown) => {
  const row = (user && typeof user === "object" ? user : {}) as ServiceParams;
  return {
    uid: row.uid ?? null,
    email: row.email ?? null,
    phone: row.contactNo ?? row.phone ?? null,
    timezone: row.timezone ?? null,
  };
};

export const logStepTrace = (event: string, ctx: ServiceParams = {}) => {
  if (!ENABLED) return;
  const { user, request, ...details } = ctx;
  const req = request as { ip?: string; headers?: Record<string, string | string[] | undefined> } | undefined;
  const entry = {
    tag: "STEP_TRACE",
    event,
    ts: new Date().toISOString(),
    ...identity(user),
    ...(req
      ? {
          ip: req.ip,
          userAgent: req.headers?.["user-agent"] || null,
        }
      : {}),
    ...details,
  };
  console.log(`[STEP_TRACE] ${JSON.stringify(entry)}`);
};
