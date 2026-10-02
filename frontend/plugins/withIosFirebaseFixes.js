const { withPodfile } = require("@expo/config-plugins");

const MARKER_BEGIN = "# @generated begin rnfirebase-static-framework";
const MARKER_END = "# @generated end rnfirebase-static-framework";

const STATIC_FRAMEWORK_BLOCK = `${MARKER_BEGIN} - expo prebuild (DO NOT MODIFY) sync with plugins/withIosFirebaseFixes.js
$RNFirebaseAsStaticFramework = true
# Resolves FirebaseAnalytics/Core instead of /IdentitySupport, which would link
# AdSupport + AppTrackingTransparency and trigger App Review Guideline 2.1 / 5.1.2(i).
$RNFirebaseAnalyticsWithoutAdIdSupport = true
${MARKER_END}
`;

const BLOCK_PATTERN = new RegExp(`${MARKER_BEGIN}[\\s\\S]*?${MARKER_END}\\n`);

/**
 * React Native Firebase requires static framework mode when using Expo's
 * `useFrameworks: static` (see expo-build-properties in app.config.js).
 */
const withRnFirebaseStaticFramework = (config) =>
  withPodfile(config, (cfg) => {
    // Rewrite an existing block so a stale Podfile picks up flag changes.
    if (cfg.modResults.contents.includes(MARKER_BEGIN)) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        BLOCK_PATTERN,
        STATIC_FRAMEWORK_BLOCK,
      );
      return cfg;
    }

    cfg.modResults.contents = cfg.modResults.contents.replace(
      /prepare_react_native_project!\n/,
      `prepare_react_native_project!\n${STATIC_FRAMEWORK_BLOCK}\n`,
    );

    return cfg;
  });

module.exports = (config) => withRnFirebaseStaticFramework(config);
