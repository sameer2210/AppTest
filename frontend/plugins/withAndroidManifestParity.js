/**
 * withAndroidManifestParity
 * Re-applies native Android manifest entries that `expo prebuild --clean` would
 * otherwise omit.
 *
 * Adds:
 *  - PostHog AUTO_INIT=false
 *  - Health Connect package queries
 *  - Play Store query + BILLING permission (Play Billing)
 *  - OEM autostart manager package queries (Android 11+)
 *  - Firebase default notification channel id
 */
const { withAndroidManifest } = require("@expo/config-plugins");

const POSTHOG_META = {
  $: {
    "android:name": "com.posthog.posthog.AUTO_INIT",
    "android:value": "false",
  },
};

const FCM_CHANNEL_META = {
  $: {
    "android:name": "com.google.firebase.messaging.default_notification_channel_id",
    "android:value": "high_importance_channel",
  },
};

const HEALTH_CONNECT_QUERIES = {
  package: [{ $: { "android:name": "com.google.android.apps.healthdata" } }],
  intent: [
    {
      action: [{ $: { "android:name": "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" } }],
    },
  ],
};

const AUTOSTART_OEM_PACKAGES = [
  "com.samsung.android.lool",
  "com.miui.securitycenter",
  "com.letv.android.letvsafe",
  "com.huawei.systemmanager",
  "com.coloros.safecenter",
  "com.oppo.safe",
  "com.iqoo.secure",
  "com.vivo.permissionmanager",
  "com.asus.mobilemanager",
  "com.oneplus.security",
  "com.evenwell.powersaving.g3",
];

const withAndroidManifestParity = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) return cfg;

    // ── application meta-data ────────────────────────────────────────────────
    app["meta-data"] = app["meta-data"] ?? [];

    const upsertMeta = (entry) => {
      const name = entry.$["android:name"];
      const idx = app["meta-data"].findIndex((m) => m.$?.["android:name"] === name);
      if (idx >= 0) {
        app["meta-data"][idx] = entry;
      } else {
        app["meta-data"].push(entry);
      }
    };

    upsertMeta(POSTHOG_META);
    upsertMeta(FCM_CHANNEL_META);

    manifest["uses-permission"] = manifest["uses-permission"] ?? [];
    const hasBillingPermission = manifest["uses-permission"].some(
      (entry) => entry.$?.["android:name"] === "com.android.vending.BILLING",
    );
    if (!hasBillingPermission) {
      manifest["uses-permission"].push({
        $: { "android:name": "com.android.vending.BILLING" },
      });
    }

    // ── manifest-level queries ───────────────────────────────────────────────
    manifest.queries = manifest.queries ?? [];

    const hasPlayStoreQuery = manifest.queries.some((q) =>
      q.package?.some((p) => p.$?.["android:name"] === "com.android.vending"),
    );
    if (!hasPlayStoreQuery) {
      manifest.queries.push({
        package: [{ $: { "android:name": "com.android.vending" } }],
      });
    }

    const hasHealthConnectQuery = manifest.queries.some((q) =>
      q.package?.some((p) => p.$?.["android:name"] === "com.google.android.apps.healthdata"),
    );
    if (!hasHealthConnectQuery) {
      manifest.queries.push(HEALTH_CONNECT_QUERIES);
    }

    const hasOemQuery = manifest.queries.some((q) =>
      q.package?.some((p) => p.$?.["android:name"] === "com.miui.securitycenter"),
    );
    if (!hasOemQuery) {
      manifest.queries.push({
        package: AUTOSTART_OEM_PACKAGES.map((name) => ({ $: { "android:name": name } })),
        intent: [{ action: [{ $: { "android:name": "miui.intent.action.OP_AUTO_START" } }] }],
      });
    }

    return cfg;
  });

module.exports = withAndroidManifestParity;
