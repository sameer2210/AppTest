#!/usr/bin/env node
/**
 * Remove duplicate legacy screen trees after Phase 3.2 physical migration.
 * Keeps thin re-export stubs at route screen paths only.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LEGACY = path.join(ROOT, "src", "screens", "stron");

/** Screen stub files to preserve (relative to LEGACY). */
const KEEP_FILES = new Set([
  "LoadingScreen.tsx",
  "settings/SettingsScreen.tsx",
  "legal/PolicyWebViewScreen.tsx",
  "notifications/NotificationsScreen.tsx",
  "QR/ConnectWithStronScreen.tsx",
  "QR/CheckInSelectionScreen.tsx",
  "auth/LoginScreen.tsx",
  "auth/OnboardingScreen.tsx",
  "auth/PreferencesScreen.tsx",
  "auth/ProfileCompletionScreen.tsx",
  "auth/AuthModal.tsx",
  "auth/AuthModalContext.tsx",
  "home/HomeScreen.tsx",
  "explore/explore_v2.1/ExploreScreen.tsx",
  "explore/explore_v2.1/SearchResultsScreen.tsx",
  "explore/explore_v2.1/FeaturedScreen.tsx",
  "profile/ProfileScreen.tsx",
  "profile/EditProfileScreen.tsx",
  "profile/BankDetailsScreen.tsx",
  "profile/GoogleFitStatsScreen.tsx",
  "profile/MyOrdersScreen.tsx",
  "profile/MyRewardsScreen.tsx",
  "business/PlansScreen.tsx",
  "business/PlanPreviewScreen.tsx",
  "business/PlanPublishedScreen.tsx",
  "business/CreatePlanScreen.tsx",
  "business/BusinessPlanScreen.tsx",
  "business/StronProScreen.tsx",
  "business/GymOnboardingScreen.tsx",
  "business/GymEditProfileScreen.tsx",
  "business/GymMembersScreen.tsx",
  "business/GymAnalyticsScreen.tsx",
  "business/GymPayoutScreen.tsx",
  "business/ListingsScreen.tsx",
  "business/ListingAnalyticsScreen.tsx",
  "business/ManualPaymentsScreen.tsx",
  "business/ManualPaymentDetailScreen.tsx",
  "business/CouponsScreen.tsx",
  "business/CreateCouponScreen.tsx",
  "plans/PlanDetailScreen.tsx",
  "plans/MyPlansScreen.tsx",
  "managedEvents/organize/OrganizeCreateScreen.tsx",
  "managedEvents/participant/ParticipantEventScreen.tsx",
  "managedEvents/preview/OrganizerPreviewScreen.tsx",
  "managedEvents/preview/ParticipantDetailScreen.tsx",
  "managedEvents/organize/EventDashboardScreen.tsx",
  "managedEvents/organize/EventSettlementScreen.tsx",
  "managedEvents/organize/OrganizeLeaderboardScreen.tsx",
  "managedEvents/organize/ExternalListingScreen.tsx",
  "managedEvents/create/CreateDuelFormatScreen.tsx",
  "managedEvents/create/CreateMarathonScreen.tsx",
  "managedEvents/create/CreateStepChallengeScreen.tsx",
  "managedEvents/create/EventPublishedScreen.tsx",
  "managedEvents/participant/ReviewPaymentScreen.tsx",
  "managedEvents/participant/PaymentSuccessScreen.tsx",
  "managedEvents/participant/PaymentFailedScreen.tsx",
  "managedEvents/step_race/Step-Race.tsx",
  "managedEvents/step_race/Ongoing-Step-Race.tsx",
  "managedEvents/step_race/Completed-Step-Race.tsx",
  "stepRace/MyRacesScreen.tsx",
]);

function walk(dir, rel = "") {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, relPath);
      continue;
    }
    if (!KEEP_FILES.has(relPath)) {
      fs.unlinkSync(full);
      console.log("removed", relPath);
    }
  }
}

function pruneEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) pruneEmptyDirs(path.join(dir, entry.name));
  }
  if (dir !== LEGACY && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    console.log("removed dir", path.relative(LEGACY, dir));
  }
}

walk(LEGACY);
pruneEmptyDirs(LEGACY);
console.log("\nLegacy cleanup complete.");
