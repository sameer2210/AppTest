import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const files = [
  "src/features/explore/ui/explore/components/CheckInCard.tsx",
  "src/features/explore/ui/explore/components/EventVenueMap.tsx",
  "src/features/explore/ui/explore/components/ExploreSearchBar.tsx",
  "src/features/explore/ui/explore/components/OrganizerNoteCard.tsx",
  "src/features/gymBusiness/ui/business/components/coupons/EditCouponModal.tsx",
  "src/features/managedEvents/ui/managedEvents/create/components/CreateGlassField.tsx",
  "src/features/managedEvents/ui/managedEvents/create/components/CreateTicketCard.tsx",
  "src/features/managedEvents/ui/managedEvents/create/components/PublishActionBar.tsx",
  "src/features/managedEvents/ui/managedEvents/create/components/SuggestionRow.tsx",
  "src/features/managedEvents/ui/managedEvents/organize/components/ExternalListingRow.tsx",
  "src/features/managedEvents/ui/managedEvents/organize/components/KotHLeaderboard.tsx",
  "src/features/managedEvents/ui/managedEvents/organize/components/StandardDashboard.tsx",
  "src/features/managedEvents/ui/managedEvents/organize/EventDashboardScreen.tsx",
  "src/features/managedEvents/ui/managedEvents/preview/components/AnalyticsPanel.tsx",
  "src/features/stepRace/ui/stepRace/v2/components/StepRaceTopToggle.tsx",
  "src/features/steps/ui/home/v2/components/HomeCommunityCards.tsx",
  "src/features/user/ui/profile/BankDetailsScreen.tsx",
];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const rel of files) {
  const fp = path.join(root, rel);
  let content = fs.readFileSync(fp, "utf8");
  if (content.includes("@/utils/typography")) continue;
  const m = content.match(/^import .+ from .+;\n/m);
  if (!m) continue;
  const at = content.indexOf(m[0]) + m[0].length;
  content =
    content.slice(0, at) +
    'import { fontTextStyles } from "@/utils/typography";\n' +
    content.slice(at);
  fs.writeFileSync(fp, content);
  console.log("import added:", rel);
}
