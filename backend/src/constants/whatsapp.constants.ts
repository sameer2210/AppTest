import { TZ } from "./common.constants.js";

/** Default local hour (0–23) for offset-based gym reminder sends. */
export const WHATSAPP_REMINDER_SEND_HOUR = 9;

export const WHATSAPP_DEFAULT_TIMEZONE = TZ;

export const WHATSAPP_QUEUE_PREFIX = "stron";

export const WHATSAPP_QUEUE_NAMES = {
  INCOMING: "whatsapp-incoming",
  OUTGOING: "whatsapp-outgoing",
  REMINDER: "reminder",
  WEBHOOK_EVENTS: "webhook-events",
} as const;

export type WhatsappQueueName =
  (typeof WHATSAPP_QUEUE_NAMES)[keyof typeof WHATSAPP_QUEUE_NAMES];

export const WHATSAPP_QUEUE_DEFAULTS = {
  INCOMING_CONCURRENCY: 5,
  OUTGOING_CONCURRENCY: 3,
  REMINDER_CONCURRENCY: 5,
  WEBHOOK_CONCURRENCY: 10,
  JOB_ATTEMPTS: 5,
  BACKOFF_MS: 2000,
  REMOVE_ON_COMPLETE: 1000,
  WORKERS_ENABLED: true,
} as const;

export const WHATSAPP_GRAPH_DEFAULT_VERSION = "v21.0";

export const WHATSAPP_GRAPH_BASE_URL = "https://graph.facebook.com";

export const WHATSAPP_GRAPH_TIMEOUT_MS = 15_000;

export const WHATSAPP_GRAPH_RETRY_SLEEP_MS = 250;

export const WHATSAPP_RETRYABLE_ERROR_CODES = new Set([
  "network_error",
  "timeout",
  "80007",
  "130429",
]);

export const WHATSAPP_PERMANENT_ERROR_CODES = new Set([
  "not_configured",
  "invalid_phone",
  "100",
  "190",
  "368",
  "131026",
  "131047",
  "131051",
  "133010",
]);

export const WHATSAPP_ACCOUNT_ENVIRONMENTS = ["test", "prod"] as const;
export type WhatsappAccountEnvironment = (typeof WHATSAPP_ACCOUNT_ENVIRONMENTS)[number];

export const WHATSAPP_MESSAGE_DIRECTIONS = ["INBOUND", "OUTBOUND"] as const;
export type WhatsappMessageDirection = (typeof WHATSAPP_MESSAGE_DIRECTIONS)[number];

export const WHATSAPP_MESSAGE_KINDS = ["TEXT", "TEMPLATE"] as const;
export type WhatsappMessageKind = (typeof WHATSAPP_MESSAGE_KINDS)[number];

export const WHATSAPP_MESSAGE_TYPES = [
  "PAYMENT_RECEIPT",
  "AUTOPAY_FAILED",
  "MANUAL_PAYMENT",
  "BROADCAST",
  "INBOUND",
] as const;
export type WhatsappMessageType = (typeof WHATSAPP_MESSAGE_TYPES)[number];

export const WHATSAPP_OUTBOUND_TYPES = [
  "PAYMENT_RECEIPT",
  "AUTOPAY_FAILED",
  "MANUAL_PAYMENT",
  "BROADCAST",
] as const;
export type WhatsappOutboundType = (typeof WHATSAPP_OUTBOUND_TYPES)[number];

export const WHATSAPP_REMINDER_STATUSES = [
  "SCHEDULED",
  "QUEUED",
  "SENDING",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "CANCELLED",
] as const;
export type WhatsappReminderStatus = (typeof WHATSAPP_REMINDER_STATUSES)[number];

export const WHATSAPP_WEBHOOK_EVENT_STATUSES = ["RECEIVED", "PROCESSED", "FAILED"] as const;
export type WhatsappWebhookEventStatus = (typeof WHATSAPP_WEBHOOK_EVENT_STATUSES)[number];

export const WHATSAPP_WEBHOOK_FIELDS = ["messages", "statuses"] as const;
export type WhatsappWebhookField = (typeof WHATSAPP_WEBHOOK_FIELDS)[number];

export const WHATSAPP_TEMPLATE_CATEGORIES = ["UTILITY", "MARKETING"] as const;
export type WhatsappTemplateCategory = (typeof WHATSAPP_TEMPLATE_CATEGORIES)[number];

export const WHATSAPP_TEMPLATE_STATUSES = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAUSED",
  "DISABLED",
] as const;
export type WhatsappTemplateStatus = (typeof WHATSAPP_TEMPLATE_STATUSES)[number];

export const WHATSAPP_TEMPLATE_KINDS = [
  "PAYMENT_RECEIPT",
  "AUTOPAY_FAILED",
  "MANUAL_PAYMENT",
  "BROADCAST",
] as const;
export type WhatsappTemplateKind = (typeof WHATSAPP_TEMPLATE_KINDS)[number];

/** Canonical Cloud API template names and language (not env — change here). */
export const WHATSAPP_TEMPLATE_DEFAULTS = {
  LANGUAGE: "en",
  PAYMENT_RECEIPT: "stron_payment_receipt",
  AUTOPAY_FAILED: "stron_autopay_failed_d0",
  AUTOPAY_FAILED_D0: "stron_autopay_failed_d0",
  AUTOPAY_FAILED_D1: "stron_autopay_failed_d1",
  AUTOPAY_FAILED_D3: "stron_autopay_failed_d3",
  MANUAL_PAYMENT: "stron_manual_payment_due",
  MANUAL_PAYMENT_3D: "stron_manual_payment_3d",
  MANUAL_PAYMENT_1D: "stron_manual_payment_1d",
  MANUAL_PAYMENT_DUE: "stron_manual_payment_due",
  BROADCAST: "stron_gym_announcement",
} as const;

export type WhatsappTemplateCatalogEntry = {
  name: string;
  language: string;
  category: WhatsappTemplateCategory;
  kind: WhatsappTemplateKind;
  dayOffset: number | null;
  body: string;
  parameterNames: string[];
  exampleParams: string[];
};

/**
 * Canonical Meta template bodies. Placeholders must be sequential {{1}}…{{n}}.
 * Create a Meta app → WhatsApp product → submit these (or run template sync) and wait for APPROVED.
 */
export const WHATSAPP_TEMPLATE_CATALOG: readonly WhatsappTemplateCatalogEntry[] = [
  {
    name: "stron_payment_receipt",
    language: "en",
    category: "UTILITY",
    kind: "PAYMENT_RECEIPT",
    dayOffset: 0,
    body: "Hi {{2}}, {{1}} received your payment of {{3}}. Thank you for staying with us.",
    parameterNames: ["gymName", "memberName", "formattedAmount"],
    exampleParams: ["Iron Gym", "Asha", "₹500"],
  },
  {
    name: "stron_manual_payment_3d",
    language: "en",
    category: "UTILITY",
    kind: "MANUAL_PAYMENT",
    dayOffset: -3,
    body: "Hey {{1}}, your {{2}} at {{3}} renews in 3 days. Pay here: {{4}}",
    parameterNames: ["memberName", "planName", "gymName", "payUrl"],
    exampleParams: ["Asha", "Quarterly Pro", "Iron Gym", "https://stron.in/pay/demo/member"],
  },
  {
    name: "stron_manual_payment_1d",
    language: "en",
    category: "UTILITY",
    kind: "MANUAL_PAYMENT",
    dayOffset: -1,
    body: "Reminder — {{1}}, your {{2}} at {{3}} renews tomorrow. Pay here: {{4}}",
    parameterNames: ["memberName", "planName", "gymName", "payUrl"],
    exampleParams: ["Asha", "Quarterly Pro", "Iron Gym", "https://stron.in/pay/demo/member"],
  },
  {
    name: "stron_manual_payment_due",
    language: "en",
    category: "UTILITY",
    kind: "MANUAL_PAYMENT",
    dayOffset: 0,
    body: "{{1}}, your {{2}} at {{3}} renewal is due today. Pay here: {{4}}",
    parameterNames: ["memberName", "planName", "gymName", "payUrl"],
    exampleParams: ["Asha", "Quarterly Pro", "Iron Gym", "https://stron.in/pay/demo/member"],
  },
  {
    name: "stron_autopay_failed_d0",
    language: "en",
    category: "UTILITY",
    kind: "AUTOPAY_FAILED",
    dayOffset: 0,
    body: "Hi {{1}}, your payment for {{2}} at {{3}} didn't go through. Retry auto-pay: {{4}}",
    parameterNames: ["memberName", "planName", "gymName", "payUrl"],
    exampleParams: ["Asha", "Quarterly Pro", "Iron Gym", "https://stron.in/pay/demo/member?autoRenew=1"],
  },
  {
    name: "stron_autopay_failed_d1",
    language: "en",
    category: "UTILITY",
    kind: "AUTOPAY_FAILED",
    dayOffset: 1,
    body: "Just a reminder — {{1}}, your {{2}} payment at {{3}} is still pending. {{4}}",
    parameterNames: ["memberName", "planName", "gymName", "payUrl"],
    exampleParams: ["Asha", "Quarterly Pro", "Iron Gym", "https://stron.in/pay/demo/member?autoRenew=1"],
  },
  {
    name: "stron_autopay_failed_d3",
    language: "en",
    category: "UTILITY",
    kind: "AUTOPAY_FAILED",
    dayOffset: 3,
    body: "Last chance — {{1}}, your {{2}} access at {{3}} may pause soon. Pay here: {{4}}",
    parameterNames: ["memberName", "planName", "gymName", "payUrl"],
    exampleParams: ["Asha", "Quarterly Pro", "Iron Gym", "https://stron.in/pay/demo/member?autoRenew=1"],
  },
  {
    name: "stron_gym_announcement",
    language: "en",
    category: "MARKETING",
    kind: "BROADCAST",
    dayOffset: null,
    body: "Announcement from {{1}}: {{2}}",
    parameterNames: ["gymName", "body"],
    exampleParams: ["Iron Gym", "Gym closed this Sunday."],
  },
];

export const defaultTemplateName = (
  kind: WhatsappTemplateKind,
  dayOffset?: number | null,
): string => {
  if (kind === "PAYMENT_RECEIPT") return WHATSAPP_TEMPLATE_DEFAULTS.PAYMENT_RECEIPT;
  if (kind === "BROADCAST") return WHATSAPP_TEMPLATE_DEFAULTS.BROADCAST;
  const offset = dayOffset ?? 0;
  if (kind === "AUTOPAY_FAILED") {
    if (offset === 1) return WHATSAPP_TEMPLATE_DEFAULTS.AUTOPAY_FAILED_D1;
    if (offset === 3) return WHATSAPP_TEMPLATE_DEFAULTS.AUTOPAY_FAILED_D3;
    return WHATSAPP_TEMPLATE_DEFAULTS.AUTOPAY_FAILED_D0;
  }
  if (offset === -3) return WHATSAPP_TEMPLATE_DEFAULTS.MANUAL_PAYMENT_3D;
  if (offset === -1) return WHATSAPP_TEMPLATE_DEFAULTS.MANUAL_PAYMENT_1D;
  return WHATSAPP_TEMPLATE_DEFAULTS.MANUAL_PAYMENT_DUE;
};

export const getWhatsappIncomingConcurrency = () => WHATSAPP_QUEUE_DEFAULTS.INCOMING_CONCURRENCY;

export const getWhatsappOutgoingConcurrency = () => WHATSAPP_QUEUE_DEFAULTS.OUTGOING_CONCURRENCY;

export const getWhatsappReminderConcurrency = () => WHATSAPP_QUEUE_DEFAULTS.REMINDER_CONCURRENCY;

export const getWhatsappWebhookConcurrency = () => WHATSAPP_QUEUE_DEFAULTS.WEBHOOK_CONCURRENCY;

export const getWhatsappJobAttempts = () => WHATSAPP_QUEUE_DEFAULTS.JOB_ATTEMPTS;

export const getWhatsappWorkersEnabled = () => WHATSAPP_QUEUE_DEFAULTS.WORKERS_ENABLED;

export const getWhatsappTestDisplayPhone = () =>
  (process.env.WHATSAPP_TEST_DISPLAY_PHONE || "").trim();

export const isRetryableWhatsappError = (
  errorCode: string | undefined,
  httpStatus?: number,
): boolean => {
  if (httpStatus != null && httpStatus >= 500) return true;
  const code = String(errorCode || "").trim();
  if (!code) return false;
  if (WHATSAPP_PERMANENT_ERROR_CODES.has(code)) return false;
  if (WHATSAPP_RETRYABLE_ERROR_CODES.has(code)) return true;
  const numeric = Number(code);
  return Number.isFinite(numeric) && numeric >= 500;
};
