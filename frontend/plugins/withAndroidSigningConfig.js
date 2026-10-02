const fs = require("fs");
const path = require("path");
const { withAppBuildGradle, withDangerousMod } = require("@expo/config-plugins");

const MARKER = "// @generated stron-release-signing";
const GRADLE_PROPS_MARKER = "# @generated stron-release-signing";

const getKeystoreFileName = (projectRoot) => {
  if (projectRoot && fs.existsSync(path.join(projectRoot, "stepwars-keystore.jks"))) {
    return "stepwars-keystore.jks";
  }
  return "stron-keystore.jks";
};

const PROP_STORE_PASSWORD = "STRON_UPLOAD_STORE_PASSWORD";
const PROP_KEY_ALIAS = "STRON_UPLOAD_KEY_ALIAS";
const PROP_KEY_PASSWORD = "STRON_UPLOAD_KEY_PASSWORD";

// Passwords/alias from .env — store file is resolved dynamically (e.g. stepwars-keystore.jks or stron-keystore.jks).
const resolveCredentials = (projectRoot) => {
  require("dotenv").config({ path: path.join(projectRoot, ".env"), override: true });
  return {
    storePassword: (process.env[PROP_STORE_PASSWORD] || "").trim(),
    keyAlias: (process.env[PROP_KEY_ALIAS] || "").trim(),
    keyPassword: (process.env[PROP_KEY_PASSWORD] || "").trim(),
  };
};

const withReleaseKeystore = (config) => {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const androidRoot = cfg.modRequest.platformProjectRoot;
      const keystoreFileName = getKeystoreFileName(projectRoot);
      const sourceKeystore = path.join(projectRoot, keystoreFileName);

      if (!fs.existsSync(sourceKeystore)) {
        throw new Error(
          `[withAndroidSigningConfig] Missing ${keystoreFileName} at project root (${sourceKeystore}).`,
        );
      }

      // Copy release keystore into android/ for local AAB/APK signing.
      fs.copyFileSync(sourceKeystore, path.join(androidRoot, keystoreFileName));

      const credentials = resolveCredentials(projectRoot);
      const gradlePropsPath = path.join(androidRoot, "gradle.properties");
      let gradleProps = fs.existsSync(gradlePropsPath)
        ? fs.readFileSync(gradlePropsPath, "utf8")
        : "";

      // Strip prior signing props (including legacy STRON_UPLOAD_STORE_FILE).
      gradleProps = gradleProps
        .split(/\r?\n/)
        .filter((line) => line !== GRADLE_PROPS_MARKER && !line.startsWith("STRON_UPLOAD_"))
        .join("\n");

      if (!credentials.storePassword || !credentials.keyAlias || !credentials.keyPassword) {
        console.warn(
          `[withAndroidSigningConfig] Missing .env keys (${PROP_STORE_PASSWORD}, ${PROP_KEY_ALIAS}, ${PROP_KEY_PASSWORD}). Release AAB/APK signing will fail until set.`,
        );
        fs.writeFileSync(gradlePropsPath, `${gradleProps.trimEnd()}\n`);
        return cfg;
      }

      const block = [
        GRADLE_PROPS_MARKER,
        `${PROP_STORE_PASSWORD}=${credentials.storePassword}`,
        `${PROP_KEY_ALIAS}=${credentials.keyAlias}`,
        `${PROP_KEY_PASSWORD}=${credentials.keyPassword}`,
        "",
      ].join("\n");

      fs.writeFileSync(gradlePropsPath, `${gradleProps.trimEnd()}\n\n${block}`);
      return cfg;
    },
  ]);
};

const withReleaseSigningGradle = (config) => {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      return cfg;
    }
    let contents = cfg.modResults.contents;
    const keystoreFileName = getKeystoreFileName(cfg.modRequest?.projectRoot);

    // Trailing newline is required: `}debug {` on one line is Groovy method-chaining
    // (release(...).debug(...)) and breaks AGP with "Could not find method debug()".
    const releaseSigningBlock = `
        ${MARKER}
        release {
            storeFile file("\${rootProject.projectDir}/${keystoreFileName}")
            storePassword findProperty('${PROP_STORE_PASSWORD}') ?: ''
            keyAlias findProperty('${PROP_KEY_ALIAS}') ?: ''
            keyPassword findProperty('${PROP_KEY_PASSWORD}') ?: ''
        }
`;

    // Remove any prior generated release block (and a possible orphan `}` left by older plugin runs).
    const markerEscaped = MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    contents = contents.replace(
      new RegExp(`\\s*${markerEscaped}[\\s\\S]*?release\\s*\\{[\\s\\S]*?\\n\\s*\\}\\s*\\}?`),
      "\n",
    );

    contents = contents.replace(/signingConfigs\s*\{/, (match) => `${match}${releaseSigningBlock}`);

    // Release AAB/APK always signed with stron-keystore.jks — never debug.
    contents = contents.replace(
      /signingConfig project\.hasProperty\('STRON_UPLOAD_STORE_FILE'\) \? signingConfigs\.release : signingConfigs\.debug/,
      "signingConfig signingConfigs.release",
    );
    contents = contents.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig signingConfigs.release",
    );

    // Play Billing rejects debug-keystore USB installs with:
    // "This version of the application is not configured for billing through Google Play."
    // Sign local `expo run:android` / android:device builds with the upload key too.
    contents = contents.replace(
      /buildTypes\s*\{\s*debug\s*\{\s*signingConfig signingConfigs\.debug/,
      "buildTypes {\n        debug {\n            signingConfig signingConfigs.release",
    );
    if (
      !/buildTypes\s*\{[\s\S]*?debug\s*\{[\s\S]*?signingConfig signingConfigs\.release/.test(
        contents,
      )
    ) {
      contents = contents.replace(
        /buildTypes\s*\{\s*debug\s*\{/,
        "buildTypes {\n        debug {\n            signingConfig signingConfigs.release\n",
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};

module.exports = (config) => {
  config = withReleaseKeystore(config);
  config = withReleaseSigningGradle(config);
  return config;
};
