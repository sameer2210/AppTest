#!/usr/bin/env node
/**
 * Phase 3: create feature ui/screens bridge re-exports and update app routes.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** @type {Record<string, Array<{ name: string; legacy: string; kind?: "default" | "named"; named?: string }>>} */
const FEATURE_SCREENS = {
  auth: [
    { name: "LoginScreen", legacy: "@/features/auth/ui/screens/LoginScreen" },
    { name: "OnboardingScreen", legacy: "@/features/auth/ui/screens/OnboardingScreen" },
    { name: "PreferencesScreen", legacy: "@/features/auth/ui/screens/PreferencesScreen" },
    { name: "ProfileCompletionScreen", legacy: "@/features/auth/ui/screens/ProfileCompletionScreen" },
  ],
  steps: [{ name: "HomeScreen", legacy: "@/features/steps/ui/screens/HomeScreen" }],
  explore: [
    { name: "ExploreScreen", legacy: "@/features/explore/ui/screens/ExploreScreen" },
    { name: "SearchResultsScreen", legacy: "@/features/explore/ui/screens/SearchResultsScreen" },
    { name: "FeaturedScreen", legacy: "@/features/explore/ui/screens/FeaturedScreen" },
  ],
  user: [
    { name: "ProfileScreen", legacy: "@/features/user/ui/screens/ProfileScreen" },
    { name: "EditProfileScreen", legacy: "@/features/user/ui/screens/EditProfileScreen" },
    { name: "BankDetailsScreen", legacy: "@/features/user/ui/screens/BankDetailsScreen" },
    { name: "GoogleFitStatsScreen", legacy: "@/features/user/ui/screens/GoogleFitStatsScreen" },
    { name: "MyOrdersScreen", legacy: "@/features/user/ui/screens/MyOrdersScreen" },
    { name: "MyRewardsScreen", legacy: "@/features/user/ui/screens/MyRewardsScreen" },
  ],
  notifications: [
    { name: "NotificationsScreen", legacy: "@/features/notifications/ui/screens/NotificationsScreen" },
  ],
  connect: [
    { name: "ConnectWithStronScreen", legacy: "@/features/connect/ui/screens/ConnectWithStronScreen" },
    { name: "CheckInSelectionScreen", legacy: "@/features/connect/ui/screens/CheckInSelectionScreen" },
  ],
  gymBusiness: [
    { name: "PlansScreen", legacy: "@/features/gymBusiness/ui/screens/PlansScreen" },
    { name: "PlanPreviewScreen", legacy: "@/features/gymBusiness/ui/screens/PlanPreviewScreen" },
    { name: "PlanPublishedScreen", legacy: "@/features/gymBusiness/ui/screens/PlanPublishedScreen" },
    { name: "CreatePlanScreen", legacy: "@/features/gymBusiness/ui/screens/CreatePlanScreen" },
    { name: "BusinessPlanScreen", legacy: "@/features/gymBusiness/ui/screens/BusinessPlanScreen" },
    { name: "StronProScreen", legacy: "@/features/gymBusiness/ui/screens/StronProScreen" },
    {
      name: "GymOnboardingScreen",
      legacy: "@/features/gymBusiness/ui/screens/GymOnboardingScreen",
      kind: "named",
      named: "GymOnboardingScreen",
    },
    { name: "GymEditProfileScreen", legacy: "@/features/gymBusiness/ui/screens/GymEditProfileScreen" },
    { name: "GymMembersScreen", legacy: "@/features/gymBusiness/ui/screens/GymMembersScreen" },
    { name: "GymAnalyticsScreen", legacy: "@/features/gymBusiness/ui/screens/GymAnalyticsScreen" },
    { name: "GymPayoutScreen", legacy: "@/features/gymBusiness/ui/screens/GymPayoutScreen" },
    { name: "ListingsScreen", legacy: "@/features/gymBusiness/ui/screens/ListingsScreen" },
    {
      name: "ListingAnalyticsScreen",
      legacy: "@/features/gymBusiness/ui/screens/ListingAnalyticsScreen",
      kind: "named",
      named: "ListingAnalyticsScreen",
    },
    { name: "ManualPaymentsScreen", legacy: "@/features/gymBusiness/ui/screens/ManualPaymentsScreen" },
    { name: "ManualPaymentDetailScreen", legacy: "@/features/gymBusiness/ui/screens/ManualPaymentDetailScreen" },
    { name: "CouponsScreen", legacy: "@/features/gymBusiness/ui/screens/CouponsScreen" },
    { name: "CreateCouponScreen", legacy: "@/features/gymBusiness/ui/screens/CreateCouponScreen" },
    { name: "PlanDetailScreen", legacy: "@/features/gymBusiness/ui/screens/PlanDetailScreen" },
    { name: "MyPlansScreen", legacy: "@/features/gymBusiness/ui/screens/MyPlansScreen" },
  ],
  managedEvents: [
    {
      name: "OrganizeCreateScreen",
      legacy: "@/features/managedEvents/ui/screens/OrganizeCreateScreen",
    },
    {
      name: "ParticipantEventScreen",
      legacy: "@/features/managedEvents/ui/screens/ParticipantEventScreen",
    },
    {
      name: "OrganizerPreviewScreen",
      legacy: "@/features/managedEvents/ui/screens/OrganizerPreviewScreen",
    },
    {
      name: "ParticipantDetailScreen",
      legacy: "@/features/managedEvents/ui/screens/ParticipantDetailScreen",
    },
    {
      name: "EventDashboardScreen",
      legacy: "@/features/managedEvents/ui/screens/EventDashboardScreen",
    },
    {
      name: "EventSettlementScreen",
      legacy: "@/features/managedEvents/ui/screens/EventSettlementScreen",
    },
    {
      name: "OrganizeLeaderboardScreen",
      legacy: "@/features/managedEvents/ui/screens/OrganizeLeaderboardScreen",
    },
    {
      name: "ExternalListingScreen",
      legacy: "@/features/managedEvents/ui/screens/ExternalListingScreen",
    },
    {
      name: "CreateDuelFormatScreen",
      legacy: "@/features/managedEvents/ui/screens/CreateDuelFormatScreen",
    },
    {
      name: "CreateMarathonScreen",
      legacy: "@/features/managedEvents/ui/screens/CreateMarathonScreen",
    },
    {
      name: "CreateStepChallengeScreen",
      legacy: "@/features/managedEvents/ui/screens/CreateStepChallengeScreen",
    },
    {
      name: "EventPublishedScreen",
      legacy: "@/features/managedEvents/ui/screens/EventPublishedScreen",
    },
    {
      name: "ReviewPaymentScreen",
      legacy: "@/features/managedEvents/ui/screens/ReviewPaymentScreen",
    },
    {
      name: "PaymentSuccessScreen",
      legacy: "@/features/managedEvents/ui/screens/PaymentSuccessScreen",
    },
    {
      name: "PaymentFailedScreen",
      legacy: "@/features/managedEvents/ui/screens/PaymentFailedScreen",
    },
    { name: "StepRaceScreen", legacy: "@/features/managedEvents/ui/screens/StepRaceScreen" },
    {
      name: "OngoingStepRaceScreen",
      legacy: "@/features/managedEvents/ui/screens/OngoingStepRaceScreen",
    },
    {
      name: "CompletedStepRaceScreen",
      legacy: "@/features/managedEvents/ui/screens/CompletedStepRaceScreen",
    },
    { name: "ActivityScreen", legacy: "@/features/managedEvents/ui/screens/ActivityScreen" },
  ],
  stepRace: [{ name: "MyRacesScreen", legacy: "@/features/stepRace/ui/screens/MyRacesScreen" }],
  system: [
    { name: "LoadingScreen", legacy: "@/features/system/ui/screens/LoadingScreen" },
    { name: "SettingsScreen", legacy: "@/features/system/ui/screens/SettingsScreen" },
    { name: "PolicyWebViewScreen", legacy: "@/features/system/ui/screens/PolicyWebViewScreen" },
  ],
};

/** @type {Array<{ app: string; feature: string; screen: string; kind?: "default" | "named" | "importDefault"; named?: string }>} */
const APP_ROUTES = [
  { app: "app/index.tsx", feature: "system", screen: "LoadingScreen" },
  { app: "app/auth/login.tsx", feature: "auth", screen: "LoginScreen", kind: "importDefault" },
  { app: "app/auth/onboarding.tsx", feature: "auth", screen: "OnboardingScreen" },
  { app: "app/(app)/preferences.tsx", feature: "auth", screen: "PreferencesScreen" },
  { app: "app/(app)/profile-completion.tsx", feature: "auth", screen: "ProfileCompletionScreen" },
  { app: "app/(app)/(tabs)/index.tsx", feature: "steps", screen: "HomeScreen" },
  { app: "app/(app)/(tabs)/explore.tsx", feature: "explore", screen: "ExploreScreen", kind: "importDefault" },
  { app: "app/(app)/search-results.tsx", feature: "explore", screen: "SearchResultsScreen" },
  { app: "app/(app)/featured-events.tsx", feature: "explore", screen: "FeaturedScreen" },
  { app: "app/(app)/(tabs)/profile.tsx", feature: "user", screen: "ProfileScreen" },
  { app: "app/(app)/edit-profile.tsx", feature: "user", screen: "EditProfileScreen" },
  { app: "app/(app)/bank-details.tsx", feature: "user", screen: "BankDetailsScreen" },
  { app: "app/(app)/google-fit-stats.tsx", feature: "user", screen: "GoogleFitStatsScreen" },
  { app: "app/(app)/my-orders.tsx", feature: "user", screen: "MyOrdersScreen" },
  { app: "app/(app)/event-rewards.tsx", feature: "user", screen: "MyRewardsScreen" },
  { app: "app/(app)/notifications.tsx", feature: "notifications", screen: "NotificationsScreen" },
  { app: "app/(app)/connect-with-stron.tsx", feature: "connect", screen: "ConnectWithStronScreen" },
  { app: "app/(app)/check-in-selection.tsx", feature: "connect", screen: "CheckInSelectionScreen" },
  { app: "app/(app)/plans.tsx", feature: "gymBusiness", screen: "PlansScreen" },
  { app: "app/(app)/plan-preview.tsx", feature: "gymBusiness", screen: "PlanPreviewScreen" },
  { app: "app/(app)/plan-detail.tsx", feature: "gymBusiness", screen: "PlanDetailScreen" },
  { app: "app/(app)/my-plans.tsx", feature: "gymBusiness", screen: "MyPlansScreen" },
  { app: "app/(app)/plan-published.tsx", feature: "gymBusiness", screen: "PlanPublishedScreen" },
  { app: "app/(app)/create-plan.tsx", feature: "gymBusiness", screen: "CreatePlanScreen" },
  { app: "app/(app)/(tabs)/plan.tsx", feature: "gymBusiness", screen: "BusinessPlanScreen" },
  { app: "app/(app)/business-plan.tsx", feature: "gymBusiness", screen: "BusinessPlanScreen" },
  { app: "app/(app)/stron-pro.tsx", feature: "gymBusiness", screen: "StronProScreen" },
  {
    app: "app/(app)/gym-onboarding.tsx",
    feature: "gymBusiness",
    screen: "GymOnboardingScreen",
    kind: "named",
    named: "GymOnboardingScreen",
  },
  { app: "app/(app)/gym-edit-profile.tsx", feature: "gymBusiness", screen: "GymEditProfileScreen" },
  { app: "app/(app)/gym-members.tsx", feature: "gymBusiness", screen: "GymMembersScreen" },
  { app: "app/(app)/gym-analytics.tsx", feature: "gymBusiness", screen: "GymAnalyticsScreen" },
  { app: "app/(app)/gym-payout.tsx", feature: "gymBusiness", screen: "GymPayoutScreen" },
  { app: "app/(app)/listings.tsx", feature: "gymBusiness", screen: "ListingsScreen" },
  {
    app: "app/(app)/listing-analytics.tsx",
    feature: "gymBusiness",
    screen: "ListingAnalyticsScreen",
    kind: "named",
    named: "ListingAnalyticsScreen",
  },
  { app: "app/(app)/manual-payments.tsx", feature: "gymBusiness", screen: "ManualPaymentsScreen" },
  {
    app: "app/(app)/manual-payment-detail.tsx",
    feature: "gymBusiness",
    screen: "ManualPaymentDetailScreen",
  },
  { app: "app/(app)/coupons.tsx", feature: "gymBusiness", screen: "CouponsScreen" },
  { app: "app/(app)/create-coupon.tsx", feature: "gymBusiness", screen: "CreateCouponScreen" },
  {
    app: "app/(app)/(tabs)/organize-create.tsx",
    feature: "managedEvents",
    screen: "OrganizeCreateScreen",
  },
  { app: "app/(app)/stron-event.tsx", feature: "managedEvents", screen: "ParticipantEventScreen" },
  { app: "app/(app)/organizer-preview.tsx", feature: "managedEvents", screen: "OrganizerPreviewScreen" },
  { app: "app/(app)/participant-detail.tsx", feature: "managedEvents", screen: "ParticipantDetailScreen" },
  { app: "app/(app)/event-dashboard.tsx", feature: "managedEvents", screen: "EventDashboardScreen" },
  { app: "app/(app)/event-settlement.tsx", feature: "managedEvents", screen: "EventSettlementScreen" },
  {
    app: "app/(app)/organize-leaderboard.tsx",
    feature: "managedEvents",
    screen: "OrganizeLeaderboardScreen",
  },
  { app: "app/(app)/external-listing.tsx", feature: "managedEvents", screen: "ExternalListingScreen" },
  { app: "app/(app)/create-face-off.tsx", feature: "managedEvents", screen: "CreateDuelFormatScreen" },
  {
    app: "app/(app)/create-king-of-the-hill.tsx",
    feature: "managedEvents",
    screen: "CreateDuelFormatScreen",
  },
  { app: "app/(app)/create-marathon.tsx", feature: "managedEvents", screen: "CreateMarathonScreen" },
  {
    app: "app/(app)/create-step-challenge.tsx",
    feature: "managedEvents",
    screen: "CreateStepChallengeScreen",
  },
  { app: "app/(app)/event-published.tsx", feature: "managedEvents", screen: "EventPublishedScreen" },
  { app: "app/(app)/review-payment.tsx", feature: "managedEvents", screen: "ReviewPaymentScreen" },
  { app: "app/(app)/payment-success.tsx", feature: "managedEvents", screen: "PaymentSuccessScreen" },
  { app: "app/(app)/payment-failed.tsx", feature: "managedEvents", screen: "PaymentFailedScreen" },
  { app: "app/(app)/step-race.tsx", feature: "managedEvents", screen: "StepRaceScreen" },
  { app: "app/(app)/ongoing-step-race.tsx", feature: "managedEvents", screen: "OngoingStepRaceScreen" },
  {
    app: "app/(app)/completed-step-race.tsx",
    feature: "managedEvents",
    screen: "CompletedStepRaceScreen",
  },
  { app: "app/(app)/(tabs)/activity.tsx", feature: "managedEvents", screen: "ActivityScreen" },
  { app: "app/(app)/my-races.tsx", feature: "stepRace", screen: "MyRacesScreen" },
  { app: "app/(app)/settings.tsx", feature: "system", screen: "SettingsScreen" },
  { app: "app/(app)/policy-webview.tsx", feature: "system", screen: "PolicyWebViewScreen" },
];

function writeBridgeFile(feature, screen) {
  const dir = path.join(ROOT, "src", "features", feature, "ui", "screens");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${screen.name}.tsx`);
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, "utf8");
    if (!existing.startsWith('export { default } from "') && !existing.startsWith("export {")) {
      return;
    }
  }
  let content;
  if (screen.kind === "named") {
    content = `export { ${screen.named} as default } from "${screen.legacy}";\n`;
  } else {
    content = `export { default } from "${screen.legacy}";\n`;
  }
  fs.writeFileSync(file, content, "utf8");
}

function writeScreenIndex(feature, screens) {
  const dir = path.join(ROOT, "src", "features", feature, "ui", "screens");
  fs.mkdirSync(dir, { recursive: true });
  const lines = screens.map((s) => `export { default as ${s.name} } from "./${s.name}";`);
  fs.writeFileSync(path.join(dir, "index.ts"), `${lines.join("\n")}\n`, "utf8");
}

function ensureFeatureIndex(feature, screens) {
  const indexPath = path.join(ROOT, "src", "features", feature, "index.ts");
  let content = "";
  if (fs.existsSync(indexPath)) {
    content = fs.readFileSync(indexPath, "utf8");
  } else {
    content = `/** Public API — external consumers import only from here. */\n`;
  }
  const exportLine = `export { ${screens.map((s) => s.name).join(", ")} } from "./ui/screens";`;
  if (!content.includes('from "./ui/screens"')) {
    content = `${content.trimEnd()}\n${exportLine}\n`;
    fs.writeFileSync(indexPath, content, "utf8");
  }
}

function writeAppRoute(route) {
  const appPath = path.join(ROOT, route.app);
  let content;
  if (route.kind === "importDefault") {
    content = `import ${route.screen} from "@/features/${route.feature}/ui/screens/${route.screen}";\n\nexport default ${route.screen};\n`;
  } else if (route.kind === "named") {
    content = `export { ${route.named} as default } from "@/features/${route.feature}/ui/screens/${route.screen}";\n`;
  } else {
    content = `export { ${route.screen} as default } from "@/features/${route.feature}/ui/screens";\n`;
  }
  fs.writeFileSync(appPath, content, "utf8");
}

for (const [feature, screens] of Object.entries(FEATURE_SCREENS)) {
  for (const screen of screens) {
    writeBridgeFile(feature, screen);
  }
  writeScreenIndex(feature, screens);
  ensureFeatureIndex(feature, screens);
  console.log("bridges:", feature, screens.length);
}

for (const route of APP_ROUTES) {
  writeAppRoute(route);
  console.log("route:", route.app);
}

console.log("\nPhase 3 screen bridges complete.");
