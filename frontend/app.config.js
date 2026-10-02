const path = require("path");

// .env is the single source for API URLs and other build-time config.
require("dotenv").config({ path: path.resolve(__dirname, ".env"), override: true });

const { fontPaths } = require("./fonts.config");
const {
  appDisplayName,
  iosBundleId,
  androidPackage,
  iosBgTaskSchedulerIdentifiers,
} = require("./app.identity.config");
const appVersion = require("./app.version.config");

const iosAppIcon = "./assets/icon-ios/AppIcon.appiconset/ItunesArtwork@2x.png";

const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ?? "";

// Embed at config time from .env so release bundles always match .env.
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? "";
const apiBaseUrlPhysical = process.env.EXPO_PUBLIC_API_BASE_URL_PHYSICAL?.trim() ?? "";
const useAdbReverse = process.env.EXPO_PUBLIC_USE_ADB_REVERSE === "true";
// Non-EXPO_PUBLIC_ vars are not inlined by Metro, so we embed them in `extra`
// at build time — Expo public env vars available via process.env.
const marathonCouponCode = (
  process.env.EXPO_PUBLIC_MARATHON_COUPON_CODE ||
  process.env.MARATHON_COUPON_CODE ||
  ""
).trim();
const marathonCouponDiscountPercent = Math.max(
  0,
  Math.min(
    100,
    Number(
      process.env.EXPO_PUBLIC_MARATHON_COUPON_DISCOUNT_PERCENT ||
        process.env.MARATHON_COUPON_DISCOUNT_PERCENT ||
        0,
    ) || 0,
  ),
);
const isMarketingApexHost = (hostname) => {
  const h = String(hostname || "")
    .toLowerCase()
    .replace(/^www\./, "");
  return h === "stron.in";
};

const parseEventShareBase = (raw) => {
  const trimmed = String(raw || "")
    .trim()
    .replace(/\/$/, "");
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (isMarketingApexHost(url.hostname)) return null;
    if (
      url.hostname === "api.stron.in" ||
      url.hostname === "apidev.stron.in" ||
      url.hostname.endsWith(".stron.in") ||
      url.hostname === "localhost" ||
      url.hostname === "10.0.2.2" ||
      /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)
    ) {
      return `${url.protocol}//${url.host}`;
    }
    return null;
  } catch {
    return null;
  }
};

const eventShareBaseUrl =
  parseEventShareBase(process.env.EXPO_PUBLIC_EVENT_SHARE_BASE_URL) ||
  parseEventShareBase(apiBaseUrl) ||
  "https://api.stron.in";

module.exports = {
  expo: {
    name: appDisplayName,
    slug: "stron",
    extra: {
      eas: {
        projectId: easProjectId,
      },
      apiBaseUrl,
      apiBaseUrlPhysical,
      useAdbReverse,
      eventShareBaseUrl,
      marathonCouponCode,
      marathonCouponDiscountPercent,
      appVersion,
    },
    // Expo requires a root version (used by expo-updates `appVersion` policy). Native stores use per-platform values via withAppVersion.
    version: appVersion.android.version,
    scheme: "stron",
    icon: iosAppIcon,
    backgroundColor: "#13111F",
    ...(easProjectId
      ? {
          updates: {
            url: `https://u.expo.dev/${easProjectId}`,
          },
          runtimeVersion: {
            policy: "appVersion",
          },
        }
      : {}),
    ios: {
      // CFBundleShortVersionString — must be higher than last App Store approved train
      version: appVersion.ios.version,
      buildNumber: appVersion.ios.buildNumber,
      bundleIdentifier: iosBundleId,
      usesAppleSignIn: true,
      googleServicesFile: "./GoogleService-Info.plist",
      associatedDomains: [
        "applinks:api.stron.in",
        "applinks:apidev.stron.in",
        "applinks:stron.in",
        "applinks:stepwarsnew.firebaseapp.com",
      ],
      infoPlist: {
        NSMotionUsageDescription:
          "Stron uses your step count to track your progress in challenges and leaderboards.",
        NSLocationWhenInUseUsageDescription:
          "Stron uses your location to discover nearby events, clubs, and activities across India.",
        NSLocalNetworkUsageDescription:
          "Stron connects to your local development server while testing.",
        NSPhotoLibraryUsageDescription:
          "Stron accesses your photo library so you can choose a profile picture or upload a clan logo. For example, you can pick an existing photo from your camera roll to set as your Stron profile avatar.",
        NSPhotoLibraryAddUsageDescription:
          "Stron saves photos to your library when you download clan or event media. For example, achievement badges and event completion images can be saved directly to your Photos app.",
        NSCameraUsageDescription:
          "Stron uses your camera so you can take a new photo for your profile picture or clan logo. For example, you can snap a photo on the spot and instantly set it as your avatar.",
        UIBackgroundModes: ["fetch", "processing", "remote-notification"],
        BGTaskSchedulerPermittedIdentifiers: iosBgTaskSchedulerIdentifiers,
        UIApplicationSupportsIndirectInputEvents: true,
      },
      privacyManifests: {
        NSPrivacyTracking: false,
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["C617.1", "0A2A.1", "3B52.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1", "1C8F.1", "C56D.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
            NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
            NSPrivacyAccessedAPITypeReasons: ["E174.1", "85F4.1"],
          },
        ],
      },
    },
    android: {
      versionCode: appVersion.android.versionCode,
      package: androidPackage,
      googleServicesFile: "./google-services.json",
      permissions: [
        "android.permission.health.READ_STEPS",
        "android.permission.health.WRITE_STEPS",
        "android.permission.ACTIVITY_RECOGNITION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_HEALTH",
        "android.permission.FOREGROUND_SERVICE_SHORT_SERVICE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.WAKE_LOCK",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.CAMERA",
        "com.android.vending.BILLING",
      ],
      // Launcher icons come from assets/icon-android via plugins/withNativeAppIcons.js
      navigationBar: {
        backgroundColor: "#13111F",
        barStyle: "light-content",
      },
      // AndroidManifest invite + Firebase auth deep links
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          category: ["BROWSABLE", "DEFAULT"],
          data: [
            { scheme: "https", host: "stepwarsnew.firebaseapp.com", pathPrefix: "/__/auth/links" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/invite" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/api/invite" },
            { scheme: "https", host: "stron.in", pathPrefix: "/api/invite" },
            { scheme: "http", host: "api.stron.in", pathPrefix: "/invite" },
            { scheme: "http", host: "stron.in", pathPrefix: "/api/invite" },
            { scheme: "https", host: "stron.in", pathPrefix: "/event" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/event" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/event" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/api/event" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/api/event" },
            { scheme: "https", host: "stron.in", pathPrefix: "/api/event" },
            { scheme: "https", host: "stron.in", pathPrefix: "/plan" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/plan" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/plan" },
            { scheme: "https", host: "stron.in", pathPrefix: "/api/plan" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/api/plan" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/api/plan" },
            { scheme: "https", host: "stron.in", pathPrefix: "/opinion" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/opinion" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/opinion" },
            { scheme: "https", host: "stron.in", pathPrefix: "/api/opinion" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/api/opinion" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/api/opinion" },
            { scheme: "https", host: "stron.in", pathPrefix: "/listing" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/listing" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/listing" },
            { scheme: "https", host: "stron.in", pathPrefix: "/api/listing" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/api/listing" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/api/listing" },
            { scheme: "https", host: "stron.in", pathPrefix: "/business" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/business" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/business" },
            { scheme: "https", host: "stron.in", pathPrefix: "/api/business" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/api/business" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/api/business" },
            { scheme: "https", host: "stron.in", pathPrefix: "/connect" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/connect" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/connect" },
            { scheme: "https", host: "stron.in", pathPrefix: "/api/connect" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/api/connect" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/api/connect" },
            { scheme: "https", host: "stron.in", pathPrefix: "/user" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/user" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/user" },
            { scheme: "https", host: "stron.in", pathPrefix: "/api/user" },
            { scheme: "https", host: "api.stron.in", pathPrefix: "/api/user" },
            { scheme: "https", host: "apidev.stron.in", pathPrefix: "/api/user" },
          ],
        },
        {
          action: "VIEW",
          category: ["BROWSABLE", "DEFAULT"],
          data: [
            { scheme: "stron", host: "stron.in" },
            { scheme: "stron", host: "api.stron.in" },
            { scheme: "stron", host: "event" },
            { scheme: "stron", host: "plan" },
            { scheme: "stron", host: "opinion" },
            { scheme: "stron", host: "listing" },
            { scheme: "stron", host: "business" },
            { scheme: "stron", host: "connect" },
            { scheme: "stron", host: "user" },
          ],
        },
      ],
    },
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    splash: {
      backgroundColor: "#000000",
      image: "./assets/logo/logo.png",
      resizeMode: "contain",
    },
    newArchEnabled: true,
    plugins: [
      "./plugins/withAppDisplayName",
      "./plugins/withSplashScreenLogo",
      "./plugins/withNativeAppIcons",
      "./plugins/withAppVersion",
      "./plugins/withAndroidGradleFixes",
      "./plugins/withAndroidSigningConfig",
      "./plugins/withAndroidForegroundService",
      "./plugins/withAndroidManifestParity",
      "./plugins/withRazorpayCheckoutTheme",
      "./plugins/withIosFirebaseFixes",
      "./plugins/withIosSwiftUICoreFix",
      "expo-dev-client",
      "expo-location",
      [
        "expo-camera",
        {
          cameraPermission:
            "Stron uses the camera to scan connect QR codes and capture profile media.",
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      "expo-asset",
      "expo-localization",
      ["expo-font", { fonts: fontPaths }],
      "expo-router",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-community/datetimepicker",
      [
        "expo-build-properties",
        {
          android: {
            minSdkVersion: 26,
            usesCleartextTraffic: true,
          },
          ios: {
            useFrameworks: "static",
            buildReactNativeFromSource: true,
            // Every @react-native-firebase/* native module must be listed here (RN Firebase + Expo 54).
            forceStaticLinking: [
              "RNFBAnalytics",
              "RNFBApp",
              "RNFBAuth",
              "RNFBDatabase",
              "RNFBRemoteConfig",
            ],
          },
        },
      ],
      "expo-health-connect",
      [
        "@kingstinct/react-native-healthkit",
        {
          NSHealthShareUsageDescription:
            "Stron reads your step count from Apple Health to track your progress in challenges and leaderboards.",
          NSHealthUpdateUsageDescription:
            "Stron writes your step count to Apple Health so your activity is recorded even when the app is closed.",
          background: true,
        },
      ],
      "expo-secure-store",
      "@react-native-google-signin/google-signin",
      "expo-apple-authentication",
      "expo-web-browser",
      [
        "expo-sensors",
        {
          motionPermission:
            "Stron needs access to your motion sensors to track your daily step count.",
        },
      ],
      "expo-background-fetch",
      "expo-system-ui",
      "expo-navigation-bar",
      "expo-updates",
      [
        "expo-notifications",
        {
          icon: "./assets/logo/logo.png",
          color: "#086CFF",
          sounds: [],
          mode: "production",
        },
      ],
      "./plugins/withStoreKitConfig",
      // Must run LAST so later plugins cannot re-introduce ATT into Info.plist.
      "./plugins/withIosManifestParity",
    ],
  },
};
