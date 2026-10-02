/**
 * Fail-fast check for required environment variables at process boot.
 * Import this module first from server.js (before app/firebase) so missing
 * vars are reported together instead of one cryptic import-time crash.
 */
import "dotenv/config";

const isSet = (key) => Boolean(String(process.env[key] ?? "").trim());

/**
 * Always required — server will not start if any are missing.
 * Grouped by domain for readability; order is what we print on failure.
 */
const ALWAYS_REQUIRED = [
  // Core
  "JWT_SECRET",
  "FIREBASE_SERVICE_ACCOUNT",
  // OTP / SMS login
  "OTP_HASH_PEPPER",
  "APITXT_AUTH_KEY",
  // Razorpay (tickets, gym memberships, payouts)
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  // RevenueCat (STRON PRO IAP)
  "REVENUECAT_SECRET_KEY",
  "REVENUECAT_ENTITLEMENT_ID",
  // Cloudflare R2 (image uploads)
  "R2_BUCKET",
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  // Public URLs used in share links / App Links
  "PUBLIC_API_BASE_URL",
];

/**
 * @returns {{ missing: string[], warnings: string[] }}
 */
export function collectEnvIssues() {
  const missing = [];
  const warnings = [];

  for (const key of ALWAYS_REQUIRED) {
    if (!isSet(key)) missing.push(key);
  }

  const useInMemory = process.env.USE_IN_MEMORY_MONGO === "true";
  if (!useInMemory && !isSet("MONGO_URI")) {
    missing.push("MONGO_URI");
  }

  // Either REVENUECAT_WEBHOOK_AUTH_KEY or legacy REVENUECAT_WEBHOOK_AUTH_TOKEN
  if (!isSet("REVENUECAT_WEBHOOK_AUTH_KEY") && !isSet("REVENUECAT_WEBHOOK_AUTH_TOKEN")) {
    missing.push("REVENUECAT_WEBHOOK_AUTH_KEY");
  }

  return { missing: [...new Set(missing)], warnings: [...new Set(warnings)] };
}

/**
 * Validates required env vars and exits the process if any are missing.
 * Skipped when NODE_ENV=test (vitest loads app without going through server.js).
 */
export function validateRequiredEnv() {
  if (process.env.NODE_ENV === "test") {
    return { valid: true, missing: [], warnings: [] };
  }

  const { missing } = collectEnvIssues();

  if (missing.length > 0) {
    console.error(
      `❌ Missing required environment variables:\n  - ${missing.join("\n  - ")}\n\nCopy .env.example to .env and fill in the values.`,
    );
    process.exit(1);
  }

  console.log("✅ Required environment variables present");
  return { valid: true, missing: [], warnings: [] };
}

// Run on import so this module can be listed first in server.js and execute
// before app/firebase modules are evaluated.
validateRequiredEnv();
