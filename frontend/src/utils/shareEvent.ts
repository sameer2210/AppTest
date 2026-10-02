import { log, logError } from "@/config/devLogger";
import { captureEvent } from "@/analytics/posthog/events";
import { getShareBaseUrl } from "./shareBaseUrl";
import { shareMessageWithLink } from "./shareMessage";

/** Public event link — https://stron.in/event/:key */
export const buildEventShareUrl = (eventKey: string): string => {
  const key = eventKey.trim();
  return `${getShareBaseUrl()}/event/${encodeURIComponent(key)}`;
};

export const buildEventDeepLink = (eventKey: string): string => {
  const key = eventKey.trim();
  return `stron://event/${encodeURIComponent(key)}`;
};

type ShareEventOptions = {
  title: string;
  eventKey: string;
  intro?: string;
};

export const shareEvent = async ({ title, eventKey, intro }: ShareEventOptions): Promise<void> => {
  const key = eventKey.trim();
  if (!key) return;

  const httpsUrl = buildEventShareUrl(key);
  const headline = intro?.trim() || `Join ${title.trim() || "this event"} on STRON!`;
  const message = `${headline}\n${httpsUrl}`;

  try {
    const result = await shareMessageWithLink({
      message,
      url: httpsUrl,
      title: title.trim() || "STRON Event",
    });
    captureEvent("event_shared", { event_key: key });
    log("[shareEvent]", result);
  } catch (error) {
    logError("[shareEvent] failed", error);
  }
};
