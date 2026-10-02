/**
 * Pins the native launcher display name to app.identity.config.js.
 *
 * Prebuild can otherwise fall back to the checkout folder basename (e.g. checkout-otpelf-base)
 * when expo.name is missing during CI/EAS prebuild.
 *
 * Sets android:label="Stron" on the application tag.
 */
const {
  withAndroidManifest,
  withInfoPlist,
  withStringsXml,
  withSettingsGradle,
} = require("@expo/config-plugins");
const { appDisplayName } = require("../app.identity.config");

const sanitizeNameForGradle = (name) =>
  name.replace(/[\n\r\t]/g, "").replace(/(\/|\\|:|<|>|"|\?|\*|\|)/g, "");

const withAndroidDisplayName = (config) => {
  config = withStringsXml(config, (cfg) => {
    const strings = cfg.modResults.resources.string ?? [];
    const next = strings.filter((entry) => entry.$?.name !== "app_name");
    next.push({
      $: { name: "app_name" },
      _: appDisplayName,
    });
    cfg.modResults.resources.string = next;
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app?.$) {
      // Literal label, not dependent on a broken @string/ reference.
      app.$["android:label"] = appDisplayName;
    }
    return cfg;
  });

  config = withSettingsGradle(config, (cfg) => {
    if (cfg.modResults.language === "groovy") {
      const gradleName = sanitizeNameForGradle(appDisplayName);
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /rootProject\.name\s?=\s?(["'])(?:(?=(\\?))\2.)*?\1/g,
        `rootProject.name = '${gradleName.replace(/'/g, "\\'")}'`,
      );
    }
    return cfg;
  });

  return config;
};

const withIosDisplayName = (config) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.CFBundleDisplayName = appDisplayName;
    return cfg;
  });

module.exports = (config) => {
  config = withAndroidDisplayName(config);
  config = withIosDisplayName(config);
  return config;
};
