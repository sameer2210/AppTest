/**
 * Applies platform-specific app versions from app.version.config.js.
 * Expo's root `version` is shared; this plugin sets native values per platform.
 */
const { withAppBuildGradle, withInfoPlist, withXcodeProject } = require("@expo/config-plugins");
const appVersion = require("../app.version.config");

const withAndroidAppVersion = (config) =>
  withAppBuildGradle(config, (cfg) => {
    const { version, versionCode } = appVersion.android;
    let contents = cfg.modResults.contents;

    contents = contents.replace(/versionCode\s+\d+/g, `versionCode ${versionCode}`);
    contents = contents.replace(/versionCode\s*=\s*\d+/g, `versionCode = ${versionCode}`);

    contents = contents.replace(/versionName\s+"[^"]*"/g, `versionName "${version}"`);
    contents = contents.replace(/versionName\s*=\s*"[^"]*"/g, `versionName = "${version}"`);

    cfg.modResults.contents = contents;
    return cfg;
  });

const withIosAppVersion = (config) => {
  const { version, buildNumber } = appVersion.ios;

  // Prefer Xcode vars so Info.plist cannot drift from MARKETING_VERSION / CURRENT_PROJECT_VERSION
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.CFBundleShortVersionString = "$(MARKETING_VERSION)";
    cfg.modResults.CFBundleVersion = "$(CURRENT_PROJECT_VERSION)";
    return cfg;
  });

  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configurations = project.pbxXCBuildConfigurationSection?.() ?? {};

    for (const key of Object.keys(configurations)) {
      const entry = configurations[key];
      if (!entry || typeof entry !== "object" || !entry.buildSettings) {
        continue;
      }
      entry.buildSettings.MARKETING_VERSION = version;
      entry.buildSettings.CURRENT_PROJECT_VERSION = String(buildNumber);
    }

    return cfg;
  });

  return config;
};

module.exports = (config) => {
  config = withAndroidAppVersion(config);
  config = withIosAppVersion(config);
  return config;
};
