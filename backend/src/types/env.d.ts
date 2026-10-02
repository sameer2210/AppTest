declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: string;
    PORT?: string;
    MONGO_URI?: string;
    USE_IN_MEMORY_MONGO?: string;
    JWT_SECRET?: string;
    JWT_ACCESS_EXPIRY?: string;
    JWT_REFRESH_EXPIRY?: string;
    JWT_ACCESS_BUFFER_SECONDS?: string;
    FIREBASE_SERVICE_ACCOUNT?: string;
    FIREBASE_DB_URL?: string;
    RAZORPAY_KEY_ID?: string;
    RAZORPAY_KEY_SECRET?: string;
    CORS_ORIGINS?: string;
    INTERNAL_SYNC_TOKEN?: string;
    SM_KOTH_MIN_GROUP?: string;
    SM_KOTH_MAX_GROUP?: string;
    SM_BOT_DAILY_STEPS_MIN?: string;
    SM_BOT_DAILY_STEPS_MAX?: string;
    SM_SETTLEMENT_MIN_BUSINESS_DAYS?: string;
    SM_SETTLEMENT_MAX_BUSINESS_DAYS?: string;
    SM_PLATFORM_COMMISSION_PCT?: string;
    SM_GATEWAY_FEE_PCT?: string;
    SM_MAX_DURATION_DAYS?: string;
    SM_ACTIVE_LISTING_LIMIT?: string;
    SM_LIFECYCLE_INTERVAL_MINUTES?: string;
    SM_KOTH_RECONCILE_INTERVAL_MINUTES?: string;
    SM_FACEOFF_KO_STEP_LEAD?: string;
    SM_DEFAULT_DAY_START_HHMM?: string;
  }
}

export {};
