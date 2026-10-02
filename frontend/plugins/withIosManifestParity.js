/**
 * withIosManifestParity
 * Ensures iOS Info.plist keys survive prebuild that Expo sometimes drops
 * when placed at the wrong config level.
 *
 * iOS background modes + universal links for invite deep links.
 */
const { withInfoPlist } = require("@expo/config-plugins");
const { iosBgTaskSchedulerIdentifiers } = require("../app.identity.config");

const withIosManifestParity = (config) =>
  withInfoPlist(config, (cfg) => {
    // Background modes — fetch + processing
    const modes = new Set(cfg.modResults.UIBackgroundModes ?? []);
    modes.add("fetch");
    modes.add("processing");
    modes.add("remote-notification");
    cfg.modResults.UIBackgroundModes = [...modes];

    // App Store 90771 — required when `processing` is in UIBackgroundModes
    const taskIds = new Set(cfg.modResults.BGTaskSchedulerPermittedIdentifiers ?? []);
    for (const id of iosBgTaskSchedulerIdentifiers) {
      taskIds.add(id);
    }
    cfg.modResults.BGTaskSchedulerPermittedIdentifiers = [...taskIds];

    // Do not advertise ATT. Strip a leftover key from older prebuilds.
    delete cfg.modResults.NSUserTrackingUsageDescription;

    return cfg;
  });

module.exports = withIosManifestParity;
