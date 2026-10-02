import { log, logError } from "@/config/devLogger";
import { captureEvent } from "@/analytics/posthog/events";
import { getShareBaseUrl } from "./shareBaseUrl";
import { shareMessageWithLink } from "./shareMessage";

/** Public opinion link — https://stron.in/opinion/:questionId, or /opinion/share. */
export const buildOpinionShareUrl = (questionId?: string): string => {
  const id = String(questionId || "").trim();
  const base = getShareBaseUrl();
  return id ? `${base}/opinion/${encodeURIComponent(id)}` : `${base}/opinion/share`;
};

export const buildOpinionDeepLink = (questionId?: string): string => {
  const id = String(questionId || "").trim();
  return id ? `stron://opinion/${encodeURIComponent(id)}` : "stron://opinion";
};

export const shareOpinion = async (questionId?: string): Promise<void> => {
  const httpsUrl = buildOpinionShareUrl(questionId);
  const message = `Vote on today's STRON Opinion with your steps!\n${httpsUrl}`;

  try {
    const result = await shareMessageWithLink({
      message,
      url: httpsUrl,
      title: "STRON Opinions",
    });
    captureEvent("opinion_shared", {});
    log("[shareOpinion]", result);
  } catch (error) {
    logError("[shareOpinion] failed", error);
  }
};
