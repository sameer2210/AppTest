export const LOCAL_NOTIFICATION_ID = "local-notifications";

export const MONTH_NAMES_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const NOTIFICATION_KEYS = {
  SUBSCRIPTION: "subscriptionOffer",
};

export const TOAST_PRESETS = {
  GENERAL: "general",
  FAILURE: "failure",
  SUCCESS: "success",
  WARNING: "warning",
  INFO: "info",
} as const;

export type ToastPreset = (typeof TOAST_PRESETS)[keyof typeof TOAST_PRESETS];

/** Infer toast variant from message text when callers omit an explicit type. */
export const inferToastPreset = (msg: string): ToastPreset => {
  const text = String(msg || "").trim();
  if (!text) return TOAST_PRESETS.INFO;

  const failure =
    /\b(fail|failed|failure|error|unable|denied|missing|could not|couldn't|can'?t open|not found|not available|upload failed|try again|something went wrong|went wrong)\b/i.test(
      text,
    ) || /\bfailed to\b/i.test(text);

  const success =
    /\b(success|successfully|saved|updated|verified|created|registered|applied|copied|deleted|stopped|published|complete|completed|done|thanks for|you'?re registered|logo saved|location set|step goal updated|coupon applied)\b/i.test(
      text,
    );

  const warning =
    /\b(please|must|required|invalid|enter a|paste your|cannot|can'?t|closed|sold out|accept|permission|select|agree|warning|already)\b/i.test(
      text,
    );

  // Prefer error > success > warning > info
  if (failure) return TOAST_PRESETS.FAILURE;
  if (success) return TOAST_PRESETS.SUCCESS;
  if (warning) return TOAST_PRESETS.WARNING;
  return TOAST_PRESETS.INFO;
};
