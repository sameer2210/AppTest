/**
 * App version — single source for Expo (app.config.js), EAS builds, and native prebuild.
 *
 * iOS and Android versions are independent.
 * Parity reference:
 *   Android — versionName / versionCode
 *   iOS     — CFBundleShortVersionString / CFBundleVersion
 */
module.exports = {
  ios: {
    /** CFBundleShortVersionString / MARKETING_VERSION */
    version: "3.4",
    /** CFBundleVersion / CURRENT_PROJECT_VERSION */
    buildNumber: "22",
  },
  android: {
    /** versionName */
    version: "2.3.1",
    /** versionCode */
    versionCode: 101,
  },
};
