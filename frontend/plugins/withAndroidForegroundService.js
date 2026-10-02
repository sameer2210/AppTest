/**
 * withAndroidForegroundService
 * Expo config plugin that injects the native Android foreground service
 * (StronStepService + StronStepModule + StronBootReceiver) into the app.
 *
 * What this does (foreground service setup):
 *  1. Declares the Service and BroadcastReceiver in AndroidManifest.xml
 *  2. Copies the Kotlin source files into the Android project
 *  3. Registers StronStepPackage in MainApplication.kt
 *
 * Run `npx expo prebuild --clean` after adding this plugin.
 */

const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");

const NATIVE_FILES = [
  "StronStepService.kt",
  "StronStepModule.kt",
  "StronStepPackage.kt",
  "StronBootReceiver.kt",
  "StronNotificationLayout.kt",
  "StronNotificationBrand.kt",
  "StronRaceLiveNotification.kt",
  "StronEventLiveNotification.kt",
];

const LOGO_REL = "assets/logo/logo.png";
const ANDROID_DRAWABLE_DIRS = [
  "drawable",
  "drawable-mdpi",
  "drawable-hdpi",
  "drawable-xhdpi",
  "drawable-xxhdpi",
  "drawable-xxxhdpi",
];

const MARKER = "// @stron-step-service-registered";

// ─── 1. AndroidManifest.xml ───────────────────────────────────────────────────

const withServiceManifest = (config) => {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];

    // ── Foreground service declaration ──────────────────────────────────────
    const services = app.service ?? [];
    const serviceExists = services.some((s) => s.$?.["android:name"]?.includes("StronStepService"));
    if (!serviceExists) {
      app.service = [
        ...services,
        {
          $: {
            "android:name": ".StronStepService",
            "android:enabled": "true",
            "android:exported": "false",
            "android:foregroundServiceType": "health|shortService",
            "android:stopWithTask": "false",
          },
        },
      ];
    }

    // ── Boot receiver ───────────────────────────────────────────────────────
    const receivers = app.receiver ?? [];
    const receiverExists = receivers.some((r) =>
      r.$?.["android:name"]?.includes("StronBootReceiver"),
    );
    if (!receiverExists) {
      app.receiver = [
        ...receivers,
        {
          $: {
            "android:name": ".StronBootReceiver",
            "android:enabled": "true",
            "android:exported": "true",
          },
          "intent-filter": [
            {
              action: [
                { $: { "android:name": "android.intent.action.BOOT_COMPLETED" } },
                { $: { "android:name": "android.intent.action.QUICKBOOT_POWERON" } },
              ],
            },
          ],
        },
      ];
    }

    return cfg;
  });
};

// ─── 2. Copy Kotlin source files ──────────────────────────────────────────────

const withKotlinFiles = (config) => {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const packageName = cfg.android?.package ?? "com.stepwars.stepwarsnew_app";
      const packagePath = packageName.replace(/\./g, "/");
      const destDir = path.join(
        cfg.modRequest.platformProjectRoot,
        `app/src/main/java/${packagePath}`,
      );
      fs.mkdirSync(destDir, { recursive: true });

      const srcDir = path.join(__dirname, "native");
      for (const file of NATIVE_FILES) {
        const srcFile = path.join(srcDir, file);
        if (!fs.existsSync(srcFile)) {
          console.warn(`[withAndroidForegroundService] Source file not found: ${srcFile}`);
          continue;
        }
        // Replace placeholder package with the real app package
        let content = fs.readFileSync(srcFile, "utf8");
        content = content.replace(/com\.stepwars\.stepwarsnew_app/g, packageName);
        const destFile = path.join(destDir, file);
        fs.writeFileSync(destFile, content, "utf8");
      }
      return cfg;
    },
  ]);
};

// ─── 2b. Copy notification layout resources ───────────────────────────────────

const copyDirRecursive = (srcDir, destDir) => {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

const withNotificationResources = (config) => {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const srcResDir = path.join(__dirname, "native", "res");
      const destResDir = path.join(cfg.modRequest.platformProjectRoot, "app/src/main/res");
      copyDirRecursive(srcResDir, destResDir);

      // Preserve generated white silhouette + blue badge from plugins/native/res/drawable.
      // Do NOT overwrite with the raw black-bg marketing logo.png.
      const pluginDrawable = path.join(__dirname, "native", "res", "drawable");
      const whiteIcon = path.join(pluginDrawable, "notification_icon.png");
      const blueBadge = path.join(pluginDrawable, "stron_notification_logo.png");
      for (const dir of ANDROID_DRAWABLE_DIRS) {
        const destDir = path.join(destResDir, dir);
        fs.mkdirSync(destDir, { recursive: true });
        if (fs.existsSync(blueBadge)) {
          fs.copyFileSync(blueBadge, path.join(destDir, "stron_notification_logo.png"));
        }
        if (fs.existsSync(whiteIcon)) {
          fs.copyFileSync(whiteIcon, path.join(destDir, "notification_icon.png"));
        }
        for (const name of ["stron_notification_logo.xml", "notification_icon.xml"]) {
          const bad = path.join(destDir, name);
          if (fs.existsSync(bad)) fs.unlinkSync(bad);
        }
      }

      return cfg;
    },
  ]);
};

// ─── 3. Register StronStepPackage in MainApplication.kt ──────────────────────

const withMainApplicationRegistration = (config) => {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const packageName = cfg.android?.package ?? "com.stepwars.stepwarsnew_app";
      const packagePath = packageName.replace(/\./g, "/");
      const mainAppFile = path.join(
        cfg.modRequest.platformProjectRoot,
        `app/src/main/java/${packagePath}/MainApplication.kt`,
      );

      if (!fs.existsSync(mainAppFile)) {
        console.warn(
          "[withAndroidForegroundService] MainApplication.kt not found — skipping package registration.",
        );
        return cfg;
      }

      let content = fs.readFileSync(mainAppFile, "utf8");

      // Idempotency guard
      if (content.includes(MARKER)) return cfg;

      // Add import
      const importLine = `import ${packageName}.StronStepPackage`;
      if (!content.includes(importLine)) {
        content = content.replace(/^(package\s+\S+)/m, `$1\n${importLine}`);
      }

      // Inject into getPackages() — handles both .apply{} and .also{} forms
      const applyPattern =
        /PackageList\(this\)\.packages(?:\.apply\s*\{|\.also\s*\{\s*(?:packages ->|\s*)it)/;
      if (applyPattern.test(content)) {
        content = content.replace(
          applyPattern,
          (match) => `${match}\n      add(StronStepPackage()) ${MARKER}`,
        );
      } else {
        // Fallback: replace the return statement of getPackages()
        content = content.replace(
          /override fun getPackages\(\)[^{]*\{/,
          (match) =>
            `${match}\n    val packages = PackageList(this).packages\n    packages.add(StronStepPackage()) ${MARKER}\n    return packages`,
        );
      }

      fs.writeFileSync(mainAppFile, content, "utf8");
      return cfg;
    },
  ]);
};

// ─── Compose ──────────────────────────────────────────────────────────────────

module.exports = (config) => {
  config = withServiceManifest(config);
  config = withKotlinFiles(config);
  config = withNotificationResources(config);
  config = withMainApplicationRegistration(config);
  return config;
};
