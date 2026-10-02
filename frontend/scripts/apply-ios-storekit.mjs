/**
 * Wire StoreKit config into an existing ios/ folder without a full prebuild.
 * Usage: node scripts/apply-ios-storekit.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const { applyStoreKitConfig } = require("../plugins/withStoreKitConfig.js");

const iosRoot = path.join(projectRoot, "ios");
const appName = "STRON";

if (!fs.existsSync(iosRoot)) {
  console.error("ios/ not found. Run npm run prebuild or expo run:ios first.");
  process.exit(1);
}

applyStoreKitConfig({
  projectRoot,
  platformRoot: iosRoot,
  appName,
});

console.log("StoreKit config applied to ios/. Re-run npm run ios to test paywall on Simulator.");
