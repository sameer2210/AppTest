import { PostHog } from "posthog-node";
import { ANALYTICS_EVENTS } from "../constants/analyticsEvents.js";
import { logger } from "../utils/logger.util.js";
import type { ServiceParams } from "../types/service.util.js";
import { DEFAULT_POSTHOG_HOST } from "../constants/index.js";


let client: PostHog | null = null;

function getPostHogConfig(): { apiKey: string; host: string } {
  const apiKey = (process.env.POSTHOG_API_KEY || "").trim();
  let host = (process.env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST).trim().replace(/\/$/, "");
  // Env sometimes stores host without scheme → PostHog fetch throws ERR_INVALID_URL.
  if (host && !/^https?:\/\//i.test(host)) {
    host = `https://${host}`;
  }
  return { apiKey, host };
}

export function initAnalytics(): void {
  const { apiKey, host } = getPostHogConfig();
  if (!apiKey) {
    logger.warn("[Analytics] POSTHOG_API_KEY not set — backend analytics disabled.");
    return;
  }

  client = new PostHog(apiKey, {
    host,
    flushAt: 1,
    flushInterval: 2000,
  });

  logger.info("[Analytics] PostHog initialized.");
}

export async function shutdownAnalytics(): Promise<void> {
  if (!client) return;
  await client.shutdown();
}

function normalizeProperties(properties: ServiceParams = {}): ServiceParams {
  const userId = properties.user_id || properties.uid || undefined;
  const {
    user_id: _uid,
    uid: _uidAlt,
    clan_id,
    squad_id,
    battle_id,
    event_id,
    timestamp: _ts,
    ...rest
  } = properties;

  return {
    ...(userId ? { user_id: String(userId) } : {}),
    platform: "backend",
    ...(clan_id ? { clan_id: String(clan_id) } : {}),
    ...(squad_id ? { squad_id: String(squad_id) } : {}),
    ...(battle_id ? { battle_id: String(battle_id) } : {}),
    ...(event_id ? { event_id: String(event_id) } : {}),
    ...rest,
  };
}

export function trackEvent(eventName: string, properties: ServiceParams = {}): void {
  if (!client) return;

  const distinctId = String(properties.user_id || properties.uid || "system");

  client.capture({
    distinctId,
    event: eventName,
    properties: normalizeProperties(properties),
  });
}

export { ANALYTICS_EVENTS };
