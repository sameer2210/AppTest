import {
  WHATSAPP_GRAPH_DEFAULT_VERSION,
  WHATSAPP_TEMPLATE_DEFAULTS,
  defaultTemplateName,
  type WhatsappTemplateKind,
} from "./whatsapp.constants.js";
import { SWAGGER_DOCS_PASSWORD_DEFAULT, SWAGGER_DOCS_USER } from "./docs.constants.js";

export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

export const R2_ENDPOINT = (process.env.R2_ENDPOINT || "").trim().replace(/\/$/, "");
export const R2_BUCKET = (process.env.R2_BUCKET || "").trim();
export const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || "").trim();
export const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
export const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL || "")
  .trim()
  .replace(/\/$/, "");

export const getR2Endpoint = () =>
  (process.env.R2_ENDPOINT || "").trim().replace(/\/$/, "");

export const getR2Bucket = () => (process.env.R2_BUCKET || "").trim();

export const getR2AccessKeyId = () => (process.env.R2_ACCESS_KEY_ID || "").trim();

export const getR2SecretAccessKey = () =>
  (process.env.R2_SECRET_ACCESS_KEY || "").trim();

export const getR2PublicBaseUrl = () =>
  (process.env.R2_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");

export const getPublicWebBaseUrl = () =>
  (process.env.PUBLIC_WEB_BASE_URL || "https://stron.in").trim().replace(/\/$/, "") ||
  "https://stron.in";

/** Public gym join URL: `{PUBLIC_WEB_BASE_URL}/join/{slug}` plus optional query. */
export const buildPublicJoinUrl = (slug: string, query?: string) => {
  const path = `/join/${slug}${query ? `?${query}` : ""}`;
  const base = getPublicWebBaseUrl();
  return base ? `${base}${path}` : path;
};

/** Public private-plan invite URL: `{PUBLIC_WEB_BASE_URL}/plan/{inviteSlug}`. */
export const buildPublicPlanInviteUrl = (inviteSlug: string) => {
  const path = `/plan/${encodeURIComponent(inviteSlug)}`;
  const base = getPublicWebBaseUrl();
  return base ? `${base}${path}` : path;
};

/** Public member pay URL: `{PUBLIC_WEB_BASE_URL}/pay/{slug}/{memberId}`. */
export const buildPublicPayUrl = (
  slug: string | null | undefined,
  memberId: string,
  query?: string,
) => {
  const path = slug
    ? `/pay/${slug}/${memberId}${query ? `?${query}` : ""}`
    : `/pay/${memberId}${query ? `?${query}` : ""}`;
  const base = getPublicWebBaseUrl();
  return base ? `${base}${path}` : path;
};

export const getWhatsappAccessToken = () => (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();

export const getWhatsappPhoneNumberId = () => (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();

export const getWhatsappBusinessAccountId = () =>
  (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "").trim();

export const getWhatsappAppSecret = () => (process.env.WHATSAPP_APP_SECRET || "").trim();

export const getWhatsappVerifyToken = () => (process.env.WHATSAPP_VERIFY_TOKEN || "").trim();

export const getWhatsappApiVersion = () => WHATSAPP_GRAPH_DEFAULT_VERSION;

export const getWhatsappTemplateLanguage = () => WHATSAPP_TEMPLATE_DEFAULTS.LANGUAGE;

export const getWhatsappTemplateName = (
  kind: WhatsappTemplateKind,
  dayOffset?: number | null,
) => defaultTemplateName(kind, dayOffset);

export const getSwaggerDocsUser = () => SWAGGER_DOCS_USER;

export const getSwaggerDocsPassword = () =>
  (process.env.SWAGGER_PASSWORD || "").trim() || SWAGGER_DOCS_PASSWORD_DEFAULT;


export const CHESS_BOTS = [
  { id: "bot_pawn", name: "Pawn", type: "PAWN" },
  { id: "bot_bishop", name: "Bishop", type: "BISHOP" },
  { id: "bot_rook", name: "Rook", type: "ROOK" },
  { id: "bot_knight", name: "Knight", type: "KNIGHT" },
  { id: "bot_queen", name: "Queen", type: "QUEEN" },
] as const;
