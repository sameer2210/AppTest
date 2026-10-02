#!/usr/bin/env node
/**
 * Bulk FSD import migration — replaces direct @/services imports with feature clients.
 * Run: node scripts/migrate-fsd-imports.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TARGET_DIRS = [
  path.join(ROOT, "src", "screens"),
  path.join(ROOT, "src", "components"),
  path.join(ROOT, "app"),
  path.join(ROOT, "src", "services", "stepRace"),
  path.join(ROOT, "src", "shell"),
  path.join(ROOT, "src", "utils"),
  path.join(ROOT, "src", "features", "gymBusiness", "ui"),
];

const ROOT_FILES = [path.join(ROOT, "src", "registerBackgroundTask.ts")];

const IMPORT_REPLACEMENTS = [
  [
    /from ["']@\/screens\/stron\/profile\/components\/ConfirmationModal["']/g,
    'from "@/components/confirmation/ConfirmationModal"',
  ],
  [/from ["']@\/screens\/stron\/profile\/profile\.utils["']/g, 'from "@/utils/profileImage.util"'],
  [/from ["']@\/screens\/stron\/profile\/rewards\.utils["']/g, 'from "@/utils/rewards.util"'],
  [/from ["']@\/features\/events\/events\.slice["']/g, 'from "@/features/events"'],
  [
    /from ["']@\/features\/gymBusiness\/store\/gymBusiness\.slice["']/g,
    'from "@/features/gymBusiness"',
  ],
  [/from ["']@\/features\/steps\/steps\.slice["']/g, 'from "@/features/steps"'],
  [/from ["']@\/features\/steps\/steps\.thunks["']/g, 'from "@/features/steps"'],
  [
    /import\s*\{\s*StronManagedService\s*\}\s*from\s*["']@\/services\/stron\/stronManaged\.service["'];?/g,
    'import { managedEventsClient as StronManagedService } from "@/features/managedEvents";',
  ],
  [
    /import\s*\{\s*AuthService\s*\}\s*from\s*["']@\/services\/auth\/auth\.service["'];?/g,
    'import { authClient as AuthService } from "@/features/auth";',
  ],
  [
    /import\s*\{\s*StepService\s*\}\s*from\s*["']@\/services\/step\/step\.service["'];?/g,
    'import { stepsClient as StepService } from "@/features/steps";',
  ],
  [
    /import\s*\{\s*StepRaceService\s*\}\s*from\s*["']@\/services\/stepRace\/stepRace\.service["'];?/g,
    'import { stepRaceClient as StepRaceService } from "@/features/stepRace";',
  ],
  [
    /import\s*\{\s*businessApiService\s*\}\s*from\s*["']@\/services\/gym(?:\/business\.service)?["'];?/g,
    'import { gymBusinessClient } from "@/features/gymBusiness";\nconst { businessApiService } = gymBusinessClient;',
  ],
  [
    /import\s*\{\s*planApiService\s*\}\s*from\s*["']@\/services\/gym(?:\/plan\.service)?["'];?/g,
    'import { gymBusinessClient } from "@/features/gymBusiness";\nconst { planApiService } = gymBusinessClient;',
  ],
  [
    /import\s*\{\s*membershipApiService\s*\}\s*from\s*["']@\/services\/gym(?:\/membership\.service)?["'];?/g,
    'import { gymBusinessClient } from "@/features/gymBusiness";\nconst { membershipApiService } = gymBusinessClient;',
  ],
  [
    /import\s*\{\s*memberApiService\s*\}\s*from\s*["']@\/services\/gym(?:\/member\.service)?["'];?/g,
    'import { gymBusinessClient } from "@/features/gymBusiness";\nconst { memberApiService } = gymBusinessClient;',
  ],
  [
    /import\s*\{\s*paymentApiService\s*\}\s*from\s*["']@\/services\/gym(?:\/payment\.service)?["'];?/g,
    'import { gymBusinessClient } from "@/features/gymBusiness";\nconst { paymentApiService } = gymBusinessClient;',
  ],
  [
    /import\s*\{\s*payoutApiService\s*\}\s*from\s*["']@\/services\/gym(?:\/payout\.service)?["'];?/g,
    'import { gymBusinessClient } from "@/features/gymBusiness";\nconst { payoutApiService } = gymBusinessClient;',
  ],
  [
    /import\s*\{\s*analyticsApiService\s*\}\s*from\s*["']@\/services\/gym(?:\/analytics\.service)?["'];?/g,
    'import { gymBusinessClient } from "@/features/gymBusiness";\nconst { analyticsApiService } = gymBusinessClient;',
  ],
  [
    /import\s*\{\s*couponApiService\s*\}\s*from\s*["']@\/services\/gym(?:\/coupon\.service)?["'];?/g,
    'import { gymBusinessClient } from "@/features/gymBusiness";\nconst { couponApiService } = gymBusinessClient;',
  ],
  [
    /import\s*\{\s*proSubscriptionApiService\s*\}\s*from\s*["']@\/services\/gym(?:\/proSubscription\.service)?["'];?/g,
    'import { gymBusinessClient } from "@/features/gymBusiness";\nconst { proSubscriptionApiService } = gymBusinessClient;',
  ],
  [
    /import\s*\{\s*businessApiService,\s*planApiService\s*\}\s*from\s*["']@\/services\/gym["'];?/g,
    'import { gymBusinessClient } from "@/features/gymBusiness";\nconst { businessApiService, planApiService } = gymBusinessClient;',
  ],
  [
    /import\s*\{\s*planApiService,\s*businessApiService\s*\}\s*from\s*["']@\/services\/gym["'];?/g,
    'import { gymBusinessClient } from "@/features/gymBusiness";\nconst { planApiService, businessApiService } = gymBusinessClient;',
  ],
  [
    /import\s*\{\s*ImageUploadService\s*\}\s*from\s*["']@\/services\/core\/imageUpload\.service["'];?/g,
    'import { coreClient } from "@/features/core";\nconst { imageUpload: ImageUploadService } = coreClient;',
  ],
  [
    /import\s*\{\s*LocationService\s*\}\s*from\s*["']@\/services\/core\/location\.service["'];?/g,
    'import { coreClient } from "@/features/core";\nconst { location: LocationService } = coreClient;',
  ],
  [
    /import\s*\{\s*ConnectQrService\s*\}\s*from\s*["']@\/services\/stron\/connectQr\.service["'];?/g,
    'import { connectClient } from "@/features/connect";\nconst { qr: ConnectQrService } = connectClient;',
  ],
  [
    /import\s*\{\s*ConnectCheckInCatalogStore(?:,\s*type ConnectCheckInPlan)?\s*\}\s*from\s*["']@\/services\/stron\/connectCheckInCatalog\.store["'];?/g,
    'import { connectClient, type ConnectCheckInPlan } from "@/features/connect";\nconst { catalog: ConnectCheckInCatalogStore } = connectClient;',
  ],
  [
    /import\s*\{\s*RazorpayService\s*\}\s*from\s*["']@\/services\/payment\/razorpay\.service["'];?/g,
    'import { paymentsClient } from "@/features/payments";\nconst { razorpay: RazorpayService } = paymentsClient;',
  ],
  [
    /import type\s*\{\s*LocationSuggestion\s*\}\s*from\s*["']@\/services\/core\/locationSearch\.service["'];?/g,
    'import type { LocationSuggestion } from "@/features/core";',
  ],
  [
    /import type\s*\{\s*LiveStepRaceStatus\s*\}\s*from\s*["']@\/services\/stepRace\/stepRace\.live["'];?/g,
    'import type { LiveStepRaceStatus } from "@/features/stepRace";',
  ],
  [
    /import type\s*\{\s*StronEventDashboard\s*\}\s*from\s*["']@\/services\/stron\/stronManaged\.service["'];?/g,
    'import type { StronEventDashboard } from "@/features/managedEvents";',
  ],
  [
    /import\s*\{\s*StronManagedService,\s*type\s*StronApiError\s*\}\s*from\s*["']@\/services\/stron\/stronManaged\.service["'];?/g,
    'import { managedEventsClient as StronManagedService, type StronApiError } from "@/features/managedEvents";',
  ],
  [
    /import\s*\{\s*StronManagedService,\s*type\s*StronEventDashboard\s*\}\s*from\s*["']@\/services\/stron\/stronManaged\.service["'];?/g,
    'import { managedEventsClient as StronManagedService, type StronEventDashboard } from "@/features/managedEvents";',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/stron\/stronManaged\.service["'];?/g,
    (match, inner) => {
      if (inner.includes("StronManagedService")) {
        return `import { managedEventsClient as StronManagedService${inner.replace(/StronManagedService,?\s*/, "").replace(/^,\s*/, ", ")} } from "@/features/managedEvents";`.replace(
          ",  }",
          " }",
        );
      }
      return match;
    },
  ],
  [
    /import\s*\{\s*([^}]*)\}\s*from\s*["']@\/services\/payment\/razorpay\.service["'];?/g,
    'import { paymentsClient } from "@/features/payments";\nconst { razorpay: RazorpayService } = paymentsClient;',
  ],
  [
    /import\s*\{\s*downloadAndShareReceipt\s*\}\s*from\s*["']@\/services\/payment\/receiptGenerator\.service["'];?/g,
    'import { paymentsClient } from "@/features/payments";\nconst { downloadAndShareReceipt } = paymentsClient;',
  ],
  [
    /import\s*\{\s*shareHtmlAsPdf\s*\}\s*from\s*["']@\/services\/payment\/receiptGenerator\.service["'];?/g,
    'import { paymentsClient } from "@/features/payments";\nconst { shareHtmlAsPdf } = paymentsClient;',
  ],
  [
    /import\s*\{\s*generateAndShareResultPdfCard\s*\}\s*from\s*["']@\/services\/stepRace\/shareCardGenerator\.service["'];?/g,
    'import { stepRaceClient } from "@/features/stepRace";\nconst { shareCard: { generateAndShareResultPdfCard } } = stepRaceClient;',
  ],
  [
    /import\s*\{\s*resolveStepRaceOpponentAvatarSource\s*\}\s*from\s*["']@\/services\/stepRace\/stepRaceOpponentImages["'];?/g,
    'import { stepRaceClient } from "@/features/stepRace";\nconst { opponentImages: { resolveStepRaceOpponentAvatarSource } } = stepRaceClient;',
  ],
  [
    /import\s*\{\s*syncStepRaceLiveNotification\s*\}\s*from\s*["']@\/services\/stepRace\/stepRaceLiveNotification\.service["'];?/g,
    'import { stepRaceClient } from "@/features/stepRace";\nconst { liveNotification: { syncStepRaceLiveNotification } } = stepRaceClient;',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/stepRace\/stepRace\.live["'];?/g,
    'import { stepRaceClient, type LiveStepRaceStatus } from "@/features/stepRace";\nconst { live: stepRaceLive } = stepRaceClient;',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/stepRace\/stepRaceLiveNotification\.service["'];?/g,
    'import { stepRaceClient } from "@/features/stepRace";\nconst { liveNotification: stepRaceLiveNotification } = stepRaceClient;',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/stron\/managedEventsLiveNotification\.service["'];?/g,
    'import { managedEventsClient } from "@/features/managedEvents";\nconst { liveNotification: managedEventsLiveNotification } = managedEventsClient;',
  ],
  [
    /import\s*\{\s*GoogleFitService(?:,\s*HealthConnectStatus)?\s*\}\s*from\s*["']@\/services\/health\/googleFit\.service["'];?/g,
    'import { stepsClient } from "@/features/steps";\nconst { googleFit: GoogleFitService } = stepsClient;',
  ],
  [
    /import\s*\{\s*AppleHealthService\s*\}\s*from\s*["']@\/services\/health\/appleHealth\.service["'];?/g,
    'import { stepsClient } from "@/features/steps";\nconst { appleHealth: AppleHealthService } = stepsClient;',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/notification\/inboxNotification\.service["'];?/g,
    'import { notificationsClient } from "@/features/notifications";\nconst { inbox: InboxNotificationService } = notificationsClient;',
  ],
  [
    /import\s*\{\s*hasPushNotificationPermission\s*\}\s*from\s*["']@\/services\/notification\/pushNotification\.service["'];?/g,
    'import { notificationsClient } from "@/features/notifications";\nconst { push: { hasPushNotificationPermission } } = notificationsClient;',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/notification\/pushNotification\.service["'];?/g,
    'import { notificationsClient } from "@/features/notifications";\nconst { push: pushNotificationService } = notificationsClient;',
  ],
  [
    /import\s*\{\s*isPermissionSheetDismissed\s*\}\s*from\s*["']@\/services\/permissions\/permissionSheetDismissal["'];?/g,
    'import { permissionsClient } from "@/features/permissions";\nconst { sheetDismissal: { isPermissionSheetDismissed } } = permissionsClient;',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/permissions\/permissionSheetController["'];?/g,
    'import { permissionsClient } from "@/features/permissions";\nconst { sheetController: permissionSheetController } = permissionsClient;',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/permissions\/permissionSheetDismissal["'];?/g,
    'import { permissionsClient } from "@/features/permissions";\nconst { sheetDismissal: permissionSheetDismissal } = permissionsClient;',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/opinion\/opinion\.service["'];?/g,
    'import { userClient } from "@/features/user";\nconst { opinion: opinionService } = userClient;',
  ],
  [
    /import\s*\{\s*UserService\s*\}\s*from\s*["']@\/services\/user\/user\.service["'];?/g,
    'import { userClient } from "@/features/user";\nconst { user: UserService } = userClient;',
  ],
  [
    /import\s*\{\s*submitUserFeedback\s*\}\s*from\s*["']@\/services\/user\/userFeedback\.service["'];?/g,
    'import { userClient } from "@/features/user";\nconst { feedback: { submitUserFeedback } } = userClient;',
  ],
  [
    /import type\s*\{\s*StronProOfferingsPrices\s*\}\s*from\s*["']@\/services\/payment\/stronProStoreOffer["'];?/g,
    'import type { StronProOfferingsPrices } from "@/features/payments";',
  ],
  [
    /import type\s*\{\s*ConnectScanItem\s*\}\s*from\s*["']@\/services\/stron\/connectQr\.service["'];?/g,
    'import type { ConnectScanItem } from "@/features/connect";',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/core\/locationSearch\.service["'];?/g,
    'import { coreClient, type LocationSuggestion } from "@/features/core";\nconst { locationSearch: locationSearchService } = coreClient;',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/stron\/connectQr\.service["'];?/g,
    'import { connectClient } from "@/features/connect";\nconst { qr: connectQrService } = connectClient;',
  ],
  [
    /import\s*\{\s*analyticsApiService\s*\}\s*from\s*["']@\/services\/gym["'];?/g,
    'import { gymBusinessClient } from "@/features/gymBusiness";\nconst { analyticsApiService } = gymBusinessClient;',
  ],
  [
    /import\s*\{\s*RevenueCatService\s*\}\s*from\s*["']@\/services\/payment\/revenueCat\.service["'];?/g,
    'import { paymentsClient } from "@/features/payments";\nconst { revenueCat: RevenueCatService } = paymentsClient;',
  ],
  [
    /import\s*\{\s*EventService\s*\}\s*from\s*["']@\/services\/event\/event\.service["'];?/g,
    'import { EventsApi } from "@/features/events";\nconst { event: EventService } = EventsApi;',
  ],
  [
    /import\s*\{\s*InterestService\s*\}\s*from\s*["']@\/services\/user\/interest\.service["'];?/g,
    'import { userClient } from "@/features/user";\nconst { interest: InterestService } = userClient;',
  ],
  [
    /import\s*\{\s*StepTrackingPermissions\s*\}\s*from\s*["']@\/services\/step\/stepTrackingPermissions\.service["'];?/g,
    'import { stepsClient } from "@/features/steps";\nconst { permissions: StepTrackingPermissions } = stepsClient;',
  ],
  [
    /import\s*\{\s*DeepLinkService\s*\}\s*from\s*["']@\/services\/core\/deepLink\.service["'];?/g,
    'import { coreClient } from "@/features/core";\nconst { deepLink: DeepLinkService } = coreClient;',
  ],
  [
    /import\s*\{\s*initializePostLoginPermissions(?:,\s*resetPostLoginPermissionsState)?\s*\}\s*from\s*["']@\/services\/postLoginPermissions["'];?/g,
    'import { permissionsClient } from "@/features/permissions";\nconst { postLogin: { initializePostLoginPermissions, resetPostLoginPermissionsState } } = permissionsClient;',
  ],
  [
    /import\s*\{\s*resetPostLoginPermissionsState\s*\}\s*from\s*["']@\/services\/postLoginPermissions["'];?/g,
    'import { permissionsClient } from "@/features/permissions";\nconst { postLogin: { resetPostLoginPermissionsState } } = permissionsClient;',
  ],
  [
    /import\s*\{\s*initializePostLoginPermissions\s*\}\s*from\s*["']@\/services\/postLoginPermissions["'];?/g,
    'import { permissionsClient } from "@/features/permissions";\nconst { postLogin: { initializePostLoginPermissions } } = permissionsClient;',
  ],
  [
    /import\s*\{\s*initializePushNotifications\s*\}\s*from\s*["']@\/services\/notification\/pushNotification\.service["'];?/g,
    'import { notificationsClient } from "@/features/notifications";\nconst { push: { initializePushNotifications } } = notificationsClient;',
  ],
  [
    /import\s*\{\s*syncAppBadgeCount\s*\}\s*from\s*["']@\/services\/notification\/inboxNotification\.service["'];?/g,
    'import { notificationsClient } from "@/features/notifications";\nconst { inbox: { syncAppBadgeCount } } = notificationsClient;',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/core\/remoteConfig\.service["'];?/g,
    'import { coreClient } from "@/features/core";\nconst { remoteConfig } = coreClient;',
  ],
  [
    /import\s*\{\s*invalidateStepNotificationHistoryCache\s*\}\s*from\s*["']@\/services\/step\/stepNotificationSync\.service["'];?/g,
    'import { stepsClient } from "@/features/steps";\nconst { notificationSync: { invalidateStepNotificationHistoryCache } } = stepsClient;',
  ],
  [
    /import\s*\{\s*clearIosStepNotification(?:,\s*invalidateStepNotificationHistoryCache)?(?:,\s*syncStepNotificationFromStore)?\s*\}\s*from\s*["']@\/services\/step\/stepNotificationSync\.service["'];?/g,
    'import { stepsClient } from "@/features/steps";\nconst { notificationSync: { clearIosStepNotification, invalidateStepNotificationHistoryCache, syncStepNotificationFromStore } } = stepsClient;',
  ],
  [
    /import\s*\{\s*syncStepNotificationFromStore\s*\}\s*from\s*["']@\/services\/step\/stepNotificationSync\.service["'];?/g,
    'import { stepsClient } from "@/features/steps";\nconst { notificationSync: { syncStepNotificationFromStore } } = stepsClient;',
  ],
  [
    /import\s*\{\s*loadStepAnalytics\s*\}\s*from\s*["']@\/services\/step\/stepAnalytics\.service["'];?/g,
    'import { stepsClient } from "@/features/steps";\nconst { analytics: { loadStepAnalytics } } = stepsClient;',
  ],
  [
    /import\s*\{([^}]+)\}\s*from\s*["']@\/services\/step\/stepAnalytics\.service["'];?/g,
    'import { stepsClient } from "@/features/steps";\nconst { analytics: stepAnalyticsService } = stepsClient;',
  ],
  [
    /import\s*\{\s*syncActiveRaceIfNeeded,\s*markRaceCompleted,\s*isRaceSyncEnded\s*\}\s*from\s*["']@\/services\/stepRace\/stepRaceSync\.service["'];?/g,
    'import { stepRaceClient } from "@/features/stepRace";\nconst { sync: { syncActiveRaceIfNeeded, markRaceCompleted, isRaceSyncEnded } } = stepRaceClient;',
  ],
  [
    /import\s*\{\s*generateMemberWhatsAppText\s*\}\s*from\s*["']@\/services\/gym\/member\.service["'];?/g,
    'import { generateMemberWhatsAppText } from "@/features/gymBusiness";',
  ],
  [/from ["'](?:\.\.\/)+features\/steps\/steps\.slice["']/g, 'from "@/features/steps"'],
  [/from ["'](?:\.\.\/)+features\/events\/events\.slice["']/g, 'from "@/features/events"'],
  [/from ["']\.\/profile\.utils["']/g, 'from "@/utils/profileImage.util"'],
  [/from ["']\.\/rewards\.utils["']/g, 'from "@/utils/rewards.util"'],
  [
    /from ["']\.\/components\/ConfirmationModal["']/g,
    'from "@/components/confirmation/ConfirmationModal"',
  ],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(full, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function migrateFile(file) {
  let content = fs.readFileSync(file, "utf8");
  const original = content;
  // Normalize relative service imports to @/services/ for unified replacement rules.
  content = content.replace(/from ["'](?:\.\.\/)+services\//g, 'from "@/services/');
  for (const [pattern, replacement] of IMPORT_REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }
  if (content !== original) {
    fs.writeFileSync(file, content);
    return true;
  }
  return false;
}

let changed = 0;
for (const dir of TARGET_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    if (migrateFile(file)) {
      changed++;
      console.log("updated:", path.relative(ROOT, file));
    }
  }
}
for (const file of ROOT_FILES) {
  if (!fs.existsSync(file)) continue;
  if (migrateFile(file)) {
    changed++;
    console.log("updated:", path.relative(ROOT, file));
  }
}
console.log(`\nDone. ${changed} files updated.`);
