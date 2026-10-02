/** App store / Firebase identity — single source for app.config.js and docs. */
module.exports = {
  /** Launcher / store display name (android:label). */
  appDisplayName: "STRON",
  iosBundleId: "com.t21.stron",
  androidPackage: "com.stepwars.stepwarsnew_app",
  // Required when UIBackgroundModes includes `processing` (App Store 90771).
  // RN tasks: registerBackgroundTask.ts. iOS: Info.plist + AppDelegate.
  iosBgTaskSchedulerIdentifiers: [
    "STRON_BACKGROUND_NOTIFICATION",
    "STRON_BACKGROUND_STEP_SYNC",
    "com.t21.stron.refresh",
    "com.t21.stron.processing",
  ],
};
