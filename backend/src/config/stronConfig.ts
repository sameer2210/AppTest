export const STRON_TZ = "Asia/Kolkata";

export const STRON_STEPS_PER_KM = 1250;

export const STRON_BOT_PREFIX = "bot_";

export type StronConfig = {
  platformCommissionPct: number;
  gatewayFeePct: number;
  maxDurationDays: number;
  activeListingLimit: number;
  kothMinGroup: number;
  kothMaxGroup: number;
  lifecycleIntervalMinutes: number;
  kothReconcileIntervalMinutes: number;
  faceOffKoStepLead: number;
  botDailyStepsMin: number;
  botDailyStepsMax: number;
  settlementMinBusinessDays: number;
  settlementMaxBusinessDays: number;
  defaultDayStartHHMM: string;
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const parseNonNegativeNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
};

export const getStronConfig = (): StronConfig => {
  const kothMinGroup = parsePositiveInt(process.env.SM_KOTH_MIN_GROUP, 2);
  const kothMaxGroup = Math.max(
    kothMinGroup,
    parsePositiveInt(process.env.SM_KOTH_MAX_GROUP, 5),
  );
  const botDailyStepsMin = parsePositiveInt(process.env.SM_BOT_DAILY_STEPS_MIN, 4000);
  const botDailyStepsMax = Math.max(
    botDailyStepsMin,
    parsePositiveInt(process.env.SM_BOT_DAILY_STEPS_MAX, 12000),
  );
  const settlementMinBusinessDays = parsePositiveInt(
    process.env.SM_SETTLEMENT_MIN_BUSINESS_DAYS,
    3,
  );
  const settlementMaxBusinessDays = Math.max(
    settlementMinBusinessDays,
    parsePositiveInt(process.env.SM_SETTLEMENT_MAX_BUSINESS_DAYS, 5),
  );

  return {
    platformCommissionPct: parseNonNegativeNumber(
      process.env.SM_PLATFORM_COMMISSION_PCT,
      10,
    ),
    gatewayFeePct: parseNonNegativeNumber(process.env.SM_GATEWAY_FEE_PCT, 2),
    maxDurationDays: parsePositiveInt(process.env.SM_MAX_DURATION_DAYS, 90),
    activeListingLimit: parsePositiveInt(process.env.SM_ACTIVE_LISTING_LIMIT, 5),
    kothMinGroup,
    kothMaxGroup,
    lifecycleIntervalMinutes: parsePositiveInt(
      process.env.SM_LIFECYCLE_INTERVAL_MINUTES,
      1,
    ),
    kothReconcileIntervalMinutes: parsePositiveInt(
      process.env.SM_KOTH_RECONCILE_INTERVAL_MINUTES,
      1,
    ),
    faceOffKoStepLead: parsePositiveInt(process.env.SM_FACEOFF_KO_STEP_LEAD, 3000),
    botDailyStepsMin,
    botDailyStepsMax,
    settlementMinBusinessDays,
    settlementMaxBusinessDays,
    defaultDayStartHHMM: String(process.env.SM_DEFAULT_DAY_START_HHMM || "00:00"),
  };
};

export default getStronConfig;
