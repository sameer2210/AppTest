const ANDROID_PACKAGE = "com.stepwars.stepwarsnew_app";

const normalizeFingerprint = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-F0-9:]/g, "");

/**
 * SHA-256 cert fingerprints for Android App Links verification.
 * Set ANDROID_APP_LINKS_SHA256 as comma-separated values in production.
 */
export const getAndroidAppLinksPayload = () => {
  const fromEnv = (process.env.ANDROID_APP_LINKS_SHA256 || "")
    .split(",")
    .map(normalizeFingerprint)
    .filter((fp) => fp.length > 0);

  if (fromEnv.length > 0) {
    return [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: ANDROID_PACKAGE,
          sha256_cert_fingerprints: fromEnv,
        },
      },
    ];
  }

  return null;
};
