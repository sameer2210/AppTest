#!/usr/bin/env node
/**
 * Phase 3.2: physically move legacy screens into feature slices.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");

const SRC_ROOTS = [
  "components",
  "hooks",
  "store",
  "features",
  "models",
  "utils",
  "constants",
  "config",
  "navigation",
  "analytics",
  "services",
  "i18n",
];

/** @type {Array<{ feature: string; from: string; to: string }>} */
const DOMAIN_COPIES = [
  { feature: "steps", from: "screens/stron/home", to: "features/steps/ui/home" },
  { feature: "explore", from: "screens/stron/explore/explore_v2.1", to: "features/explore/ui/explore" },
  { feature: "user", from: "screens/stron/profile", to: "features/user/ui/profile" },
  { feature: "gymBusiness", from: "screens/stron/business", to: "features/gymBusiness/ui/business" },
  { feature: "gymBusiness", from: "screens/stron/plans", to: "features/gymBusiness/ui/plans" },
  { feature: "managedEvents", from: "screens/stron/managedEvents", to: "features/managedEvents/ui/managedEvents" },
  { feature: "stepRace", from: "screens/stron/stepRace", to: "features/stepRace/ui/stepRace" },
];

/** @type {Array<{ from: string; to: string }>} */
const AUTH_COMPONENT_COPIES = [
  { from: "screens/stron/auth/AuthModal.tsx", to: "features/auth/ui/components/AuthModal.tsx" },
  { from: "screens/stron/auth/AuthModalContext.tsx", to: "features/auth/ui/components/AuthModalContext.tsx" },
];

/** @type {Record<string, string>} */
const LEGACY_TO_FEATURE = {
  "screens/stron/home": "features/steps/ui/home",
  "screens/stron/explore/explore_v2.1": "features/explore/ui/explore",
  "screens/stron/profile": "features/user/ui/profile",
  "screens/stron/business": "features/gymBusiness/ui/business",
  "screens/stron/plans": "features/gymBusiness/ui/plans",
  "screens/stron/managedEvents": "features/managedEvents/ui/managedEvents",
  "screens/stron/stepRace": "features/stepRace/ui/stepRace",
  "screens/stron/auth/AuthModal": "features/auth/ui/components/AuthModal",
  "screens/stron/auth/AuthModalContext": "features/auth/ui/components/AuthModalContext",
};

/** @type {Array<{ name: string; bridge: string; legacyFile: string; stub?: string; kind?: "named"; named?: string }>} */
const SCREEN_BRIDGES = [
  { name: "HomeScreen", bridge: "../home/HomeScreen", legacyFile: "screens/stron/home/HomeScreen.tsx" },
  {
    name: "ExploreScreen",
    bridge: "../explore/ExploreScreen",
    legacyFile: "screens/stron/explore/explore_v2.1/ExploreScreen.tsx",
  },
  {
    name: "SearchResultsScreen",
    bridge: "../explore/SearchResultsScreen",
    legacyFile: "screens/stron/explore/explore_v2.1/SearchResultsScreen.tsx",
  },
  {
    name: "FeaturedScreen",
    bridge: "../explore/FeaturedScreen",
    legacyFile: "screens/stron/explore/explore_v2.1/FeaturedScreen.tsx",
  },
  { name: "ProfileScreen", bridge: "../profile/ProfileScreen", legacyFile: "screens/stron/profile/ProfileScreen.tsx" },
  {
    name: "EditProfileScreen",
    bridge: "../profile/EditProfileScreen",
    legacyFile: "screens/stron/profile/EditProfileScreen.tsx",
  },
  {
    name: "BankDetailsScreen",
    bridge: "../profile/BankDetailsScreen",
    legacyFile: "screens/stron/profile/BankDetailsScreen.tsx",
  },
  {
    name: "GoogleFitStatsScreen",
    bridge: "../profile/GoogleFitStatsScreen",
    legacyFile: "screens/stron/profile/GoogleFitStatsScreen.tsx",
  },
  { name: "MyOrdersScreen", bridge: "../profile/MyOrdersScreen", legacyFile: "screens/stron/profile/MyOrdersScreen.tsx" },
  {
    name: "MyRewardsScreen",
    bridge: "../profile/MyRewardsScreen",
    legacyFile: "screens/stron/profile/MyRewardsScreen.tsx",
  },
  { name: "PlansScreen", bridge: "../business/PlansScreen", legacyFile: "screens/stron/business/PlansScreen.tsx" },
  {
    name: "PlanPreviewScreen",
    bridge: "../business/PlanPreviewScreen",
    legacyFile: "screens/stron/business/PlanPreviewScreen.tsx",
  },
  {
    name: "PlanPublishedScreen",
    bridge: "../business/PlanPublishedScreen",
    legacyFile: "screens/stron/business/PlanPublishedScreen.tsx",
  },
  {
    name: "CreatePlanScreen",
    bridge: "../business/CreatePlanScreen",
    legacyFile: "screens/stron/business/CreatePlanScreen.tsx",
  },
  {
    name: "BusinessPlanScreen",
    bridge: "../business/BusinessPlanScreen",
    legacyFile: "screens/stron/business/BusinessPlanScreen.tsx",
  },
  {
    name: "StronProScreen",
    bridge: "../business/StronProScreen",
    legacyFile: "screens/stron/business/StronProScreen.tsx",
  },
  {
    name: "GymOnboardingScreen",
    bridge: "../business/GymOnboardingScreen",
    legacyFile: "screens/stron/business/GymOnboardingScreen.tsx",
    kind: "named",
    named: "GymOnboardingScreen",
  },
  {
    name: "GymEditProfileScreen",
    bridge: "../business/GymEditProfileScreen",
    legacyFile: "screens/stron/business/GymEditProfileScreen.tsx",
  },
  {
    name: "GymMembersScreen",
    bridge: "../business/GymMembersScreen",
    legacyFile: "screens/stron/business/GymMembersScreen.tsx",
  },
  {
    name: "GymAnalyticsScreen",
    bridge: "../business/GymAnalyticsScreen",
    legacyFile: "screens/stron/business/GymAnalyticsScreen.tsx",
  },
  {
    name: "GymPayoutScreen",
    bridge: "../business/GymPayoutScreen",
    legacyFile: "screens/stron/business/GymPayoutScreen.tsx",
  },
  {
    name: "ListingsScreen",
    bridge: "../business/ListingsScreen",
    legacyFile: "screens/stron/business/ListingsScreen.tsx",
  },
  {
    name: "ListingAnalyticsScreen",
    bridge: "../business/ListingAnalyticsScreen",
    legacyFile: "screens/stron/business/ListingAnalyticsScreen.tsx",
    kind: "named",
    named: "ListingAnalyticsScreen",
  },
  {
    name: "ManualPaymentsScreen",
    bridge: "../business/ManualPaymentsScreen",
    legacyFile: "screens/stron/business/ManualPaymentsScreen.tsx",
  },
  {
    name: "ManualPaymentDetailScreen",
    bridge: "../business/ManualPaymentDetailScreen",
    legacyFile: "screens/stron/business/ManualPaymentDetailScreen.tsx",
  },
  {
    name: "CouponsScreen",
    bridge: "../business/CouponsScreen",
    legacyFile: "screens/stron/business/CouponsScreen.tsx",
  },
  {
    name: "CreateCouponScreen",
    bridge: "../business/CreateCouponScreen",
    legacyFile: "screens/stron/business/CreateCouponScreen.tsx",
  },
  { name: "PlanDetailScreen", bridge: "../plans/PlanDetailScreen", legacyFile: "screens/stron/plans/PlanDetailScreen.tsx" },
  { name: "MyPlansScreen", bridge: "../plans/MyPlansScreen", legacyFile: "screens/stron/plans/MyPlansScreen.tsx" },
  {
    name: "OrganizeCreateScreen",
    bridge: "../managedEvents/organize/OrganizeCreateScreen",
    legacyFile: "screens/stron/managedEvents/organize/OrganizeCreateScreen.tsx",
  },
  {
    name: "ParticipantEventScreen",
    bridge: "../managedEvents/participant/ParticipantEventScreen",
    legacyFile: "screens/stron/managedEvents/participant/ParticipantEventScreen.tsx",
  },
  {
    name: "OrganizerPreviewScreen",
    bridge: "../managedEvents/preview/OrganizerPreviewScreen",
    legacyFile: "screens/stron/managedEvents/preview/OrganizerPreviewScreen.tsx",
  },
  {
    name: "ParticipantDetailScreen",
    bridge: "../managedEvents/preview/ParticipantDetailScreen",
    legacyFile: "screens/stron/managedEvents/preview/ParticipantDetailScreen.tsx",
  },
  {
    name: "EventDashboardScreen",
    bridge: "../managedEvents/organize/EventDashboardScreen",
    legacyFile: "screens/stron/managedEvents/organize/EventDashboardScreen.tsx",
  },
  {
    name: "EventSettlementScreen",
    bridge: "../managedEvents/organize/EventSettlementScreen",
    legacyFile: "screens/stron/managedEvents/organize/EventSettlementScreen.tsx",
  },
  {
    name: "OrganizeLeaderboardScreen",
    bridge: "../managedEvents/organize/OrganizeLeaderboardScreen",
    legacyFile: "screens/stron/managedEvents/organize/OrganizeLeaderboardScreen.tsx",
  },
  {
    name: "ExternalListingScreen",
    bridge: "../managedEvents/organize/ExternalListingScreen",
    legacyFile: "screens/stron/managedEvents/organize/ExternalListingScreen.tsx",
  },
  {
    name: "CreateDuelFormatScreen",
    bridge: "../managedEvents/create/CreateDuelFormatScreen",
    legacyFile: "screens/stron/managedEvents/create/CreateDuelFormatScreen.tsx",
  },
  {
    name: "CreateMarathonScreen",
    bridge: "../managedEvents/create/CreateMarathonScreen",
    legacyFile: "screens/stron/managedEvents/create/CreateMarathonScreen.tsx",
  },
  {
    name: "CreateStepChallengeScreen",
    bridge: "../managedEvents/create/CreateStepChallengeScreen",
    legacyFile: "screens/stron/managedEvents/create/CreateStepChallengeScreen.tsx",
  },
  {
    name: "EventPublishedScreen",
    bridge: "../managedEvents/create/EventPublishedScreen",
    legacyFile: "screens/stron/managedEvents/create/EventPublishedScreen.tsx",
  },
  {
    name: "ReviewPaymentScreen",
    bridge: "../managedEvents/participant/ReviewPaymentScreen",
    legacyFile: "screens/stron/managedEvents/participant/ReviewPaymentScreen.tsx",
  },
  {
    name: "PaymentSuccessScreen",
    bridge: "../managedEvents/participant/PaymentSuccessScreen",
    legacyFile: "screens/stron/managedEvents/participant/PaymentSuccessScreen.tsx",
  },
  {
    name: "PaymentFailedScreen",
    bridge: "../managedEvents/participant/PaymentFailedScreen",
    legacyFile: "screens/stron/managedEvents/participant/PaymentFailedScreen.tsx",
  },
  {
    name: "StepRaceScreen",
    bridge: "../managedEvents/step_race/Step-Race",
    legacyFile: "screens/stron/managedEvents/step_race/Step-Race.tsx",
  },
  {
    name: "OngoingStepRaceScreen",
    bridge: "../managedEvents/step_race/Ongoing-Step-Race",
    legacyFile: "screens/stron/managedEvents/step_race/Ongoing-Step-Race.tsx",
  },
  {
    name: "CompletedStepRaceScreen",
    bridge: "../managedEvents/step_race/Completed-Step-Race",
    legacyFile: "screens/stron/managedEvents/step_race/Completed-Step-Race.tsx",
  },
  {
    name: "MyRacesScreen",
    bridge: "../stepRace/MyRacesScreen",
    legacyFile: "screens/stron/stepRace/MyRacesScreen.tsx",
  },
];

/** @type {Record<string, string>} */
const SCREEN_FEATURE = {
  HomeScreen: "steps",
  ExploreScreen: "explore",
  SearchResultsScreen: "explore",
  FeaturedScreen: "explore",
  ProfileScreen: "user",
  EditProfileScreen: "user",
  BankDetailsScreen: "user",
  GoogleFitStatsScreen: "user",
  MyOrdersScreen: "user",
  MyRewardsScreen: "user",
  PlansScreen: "gymBusiness",
  PlanPreviewScreen: "gymBusiness",
  PlanPublishedScreen: "gymBusiness",
  CreatePlanScreen: "gymBusiness",
  BusinessPlanScreen: "gymBusiness",
  StronProScreen: "gymBusiness",
  GymOnboardingScreen: "gymBusiness",
  GymEditProfileScreen: "gymBusiness",
  GymMembersScreen: "gymBusiness",
  GymAnalyticsScreen: "gymBusiness",
  GymPayoutScreen: "gymBusiness",
  ListingsScreen: "gymBusiness",
  ListingAnalyticsScreen: "gymBusiness",
  ManualPaymentsScreen: "gymBusiness",
  ManualPaymentDetailScreen: "gymBusiness",
  CouponsScreen: "gymBusiness",
  CreateCouponScreen: "gymBusiness",
  PlanDetailScreen: "gymBusiness",
  MyPlansScreen: "gymBusiness",
  OrganizeCreateScreen: "managedEvents",
  ParticipantEventScreen: "managedEvents",
  OrganizerPreviewScreen: "managedEvents",
  ParticipantDetailScreen: "managedEvents",
  EventDashboardScreen: "managedEvents",
  EventSettlementScreen: "managedEvents",
  OrganizeLeaderboardScreen: "managedEvents",
  ExternalListingScreen: "managedEvents",
  CreateDuelFormatScreen: "managedEvents",
  CreateMarathonScreen: "managedEvents",
  CreateStepChallengeScreen: "managedEvents",
  EventPublishedScreen: "managedEvents",
  ReviewPaymentScreen: "managedEvents",
  PaymentSuccessScreen: "managedEvents",
  PaymentFailedScreen: "managedEvents",
  StepRaceScreen: "managedEvents",
  OngoingStepRaceScreen: "managedEvents",
  CompletedStepRaceScreen: "managedEvents",
  MyRacesScreen: "stepRace",
};

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn("skip missing:", src);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function copyFile(from, to) {
  if (!fs.existsSync(from)) {
    console.warn("skip missing file:", from);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function rewriteImports(content, feature) {
  let next = content;

  for (const [legacy, target] of Object.entries(LEGACY_TO_FEATURE)) {
    next = next.replaceAll(`@/${legacy}`, `@/${target}`);
    next = next.replaceAll(`"${legacy}`, `"${target}`);
    next = next.replaceAll(`'${legacy}`, `'${target}`);
  }

  for (let depth = 2; depth <= 8; depth += 1) {
    const prefix = "../".repeat(depth);
    for (const root of SRC_ROOTS) {
      const re = new RegExp(`from (["'])${prefix.replace(/\./g, "\\.")}${root}/`, "g");
      next = next.replace(re, `from $1@/${root}/`);
      const re2 = new RegExp(`import\\((["'])${prefix.replace(/\./g, "\\.")}${root}/`, "g");
      next = next.replace(re2, `import($1@/${root}/`);
    }
  }

  if (feature === "steps") {
    next = next.replace(
      /from ["']@\/features\/steps["']/g,
      'from "@/features/steps/ui/hooks/useStepsClient"',
    );
    next = next.replace(
      /from ["']@\/features\/steps\/ui\/hooks\/useStepsClient["'];?\s*\nimport \{([^}]+)\} from ["']@\/features\/steps\/ui\/hooks\/useStepsClient["']/g,
      'from "@/features/steps/ui/hooks/useStepsClient";',
    );
  }

  if (feature === "auth") {
    next = next.replace(/from ["']@\/features\/auth["']/g, (match, offset, str) => {
      if (str.includes("AuthModal")) return match;
      return match;
    });
  }

  return next;
}

function rewriteFile(filePath, feature) {
  const content = fs.readFileSync(filePath, "utf8");
  const rewritten = rewriteImports(content, feature);
  if (rewritten !== content) fs.writeFileSync(filePath, rewritten, "utf8");
}

function migrateDomains() {
  for (const { feature, from, to } of DOMAIN_COPIES) {
    const src = path.join(SRC, from);
    const dest = path.join(SRC, to);
    console.log(`copy ${from} -> ${to}`);
    copyDir(src, dest);
    for (const file of walkFiles(dest)) rewriteFile(file, feature);
  }

  for (const { from, to } of AUTH_COMPONENT_COPIES) {
    const src = path.join(SRC, from);
    const dest = path.join(SRC, to);
    console.log(`copy ${from} -> ${to}`);
    copyFile(src, dest);
    rewriteFile(dest, "auth");
  }
}

function writeScreenBridges() {
  for (const screen of SCREEN_BRIDGES) {
    const feature = SCREEN_FEATURE[screen.name];
    const bridgePath = path.join(SRC, "features", feature, "ui", "screens", `${screen.name}.tsx`);
    const content =
      screen.kind === "named"
        ? `export { default } from "${screen.bridge}";\nexport { ${screen.named} } from "${screen.bridge}";\n`
        : `export { default } from "${screen.bridge}";\n`;
    fs.mkdirSync(path.dirname(bridgePath), { recursive: true });
    fs.writeFileSync(bridgePath, content, "utf8");

    const legacyPath = path.join(SRC, screen.legacyFile);
    const stub =
      screen.kind === "named"
        ? `export { ${screen.named} as default } from "@/features/${feature}";\n`
        : `export { ${screen.name} as default } from "@/features/${feature}";\n`;
    fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
    fs.writeFileSync(legacyPath, stub, "utf8");
  }
}

function rewriteGlobalReferences() {
  const targets = walkFiles(SRC).filter((f) => !f.includes(`${path.sep}screens${path.sep}stron${path.sep}`));
  for (const file of targets) {
    rewriteFile(file, "global");
  }
}

function updateFeatureIndexes() {
  const exploreIndex = path.join(SRC, "features/explore/index.ts");
  let explore = fs.readFileSync(exploreIndex, "utf8");
  explore = explore.replace(
    '@/screens/stron/explore/explore_v2.1/components/LocationPickerModal',
    '@/features/explore/ui/explore/components/LocationPickerModal',
  );
  explore = explore.replace(
    '@/screens/stron/explore/explore_v2.1/exploreLayout',
    '@/features/explore/ui/explore/exploreLayout',
  );
  fs.writeFileSync(exploreIndex, explore, "utf8");

  const managedIndex = path.join(SRC, "features/managedEvents/index.ts");
  let managed = fs.readFileSync(managedIndex, "utf8");
  managed = managed.replaceAll("@/screens/stron/managedEvents/", "@/features/managedEvents/ui/managedEvents/");
  fs.writeFileSync(managedIndex, managed, "utf8");

  const authIndex = path.join(SRC, "features/auth/index.ts");
  let auth = fs.readFileSync(authIndex, "utf8");
  auth = auth.replace(
    '@/screens/stron/auth/AuthModal',
    '@/features/auth/ui/components/AuthModal',
  );
  auth = auth.replace(
    '@/screens/stron/auth/AuthModalContext',
    '@/features/auth/ui/components/AuthModalContext',
  );
  fs.writeFileSync(authIndex, auth, "utf8");

  for (const [from, to] of [
    ["screens/stron/auth/AuthModal.tsx", "features/auth/ui/components/AuthModal.tsx"],
    ["screens/stron/auth/AuthModalContext.tsx", "features/auth/ui/components/AuthModalContext.tsx"],
  ]) {
    const legacy = path.join(SRC, from);
    const stub = `export * from "@/features/auth/ui/components/${path.basename(from, ".tsx")}";\n`;
    fs.writeFileSync(legacy, stub, "utf8");
  }
}

migrateDomains();
writeScreenBridges();
rewriteGlobalReferences();
updateFeatureIndexes();

console.log("\nPhase 3.2 physical migration complete.");
