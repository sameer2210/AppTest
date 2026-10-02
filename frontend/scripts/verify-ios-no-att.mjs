#!/usr/bin/env node
/**
 * Fails the build if iOS Info.plist still advertises App Tracking Transparency.
 * App Store Connect blocks "No tracking" privacy answers when this key is present
 * (and can keep blocking based on a previously live binary — see team notes).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const iosDir = join(root, "ios");
const key = "NSUserTrackingUsageDescription";

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "Pods" || name.name === "build") continue;
      walk(path, out);
    } else if (name.name === "Info.plist" || name.name.endsWith(".xcprivacy")) {
      out.push(path);
    }
  }
  return out;
};

if (!existsSync(iosDir)) {
  console.log("ℹ️  ios/ missing — run expo prebuild -p ios before verify-ios-no-att");
  process.exit(0);
}

const hits = [];
for (const file of walk(iosDir)) {
  const text = readFileSync(file, "utf8");
  if (text.includes(key)) hits.push(file);
  if (file.endsWith(".xcprivacy") && /<key>NSPrivacyTracking<\/key>\s*<true\/>/.test(text)) {
    hits.push(`${file} (NSPrivacyTracking=true)`);
  }
}

// A linked AdSupport / AppTrackingTransparency framework is enough for App Review to
// flag the binary, even with no purpose string. IdentitySupport pulls both in.
const lockPath = join(iosDir, "Podfile.lock");
if (existsSync(lockPath)) {
  const lock = readFileSync(lockPath, "utf8");
  if (lock.includes("FirebaseAnalytics/IdentitySupport")) {
    hits.push(
      "ios/Podfile.lock (FirebaseAnalytics/IdentitySupport — set $RNFirebaseAnalyticsWithoutAdIdSupport and re-run pod install)",
    );
  }
}

const podfilePath = join(iosDir, "Podfile");
if (existsSync(podfilePath)) {
  const podfile = readFileSync(podfilePath, "utf8");
  if (!podfile.includes("$RNFirebaseAnalyticsWithoutAdIdSupport = true")) {
    hits.push("ios/Podfile (missing $RNFirebaseAnalyticsWithoutAdIdSupport = true)");
  }
}

if (hits.length) {
  console.error("❌ ATT / tracking markers still present:");
  for (const h of hits) console.error(`  - ${h}`);
  console.error(
    "Remove NSUserTrackingUsageDescription, re-run prebuild, and ensure withIosManifestParity is last in app.config.js plugins.",
  );
  process.exit(1);
}

console.log("✅ No NSUserTrackingUsageDescription in ios/ Info.plist / privacy manifests");
