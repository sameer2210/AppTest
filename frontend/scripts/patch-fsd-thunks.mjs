#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");

function gitShow(headPath) {
  return execSync(`git show HEAD:${headPath}`, { cwd: ROOT, encoding: "utf8" });
}

function patchAuth(content) {
  return content
    .replace(
      /import \{ AuthService \} from ["']\.\.\/\.\.\/services\/auth\/auth\.service["'];/,
      'import AuthApi from "../api/auth.api";',
    )
    .replace(
      /import \{ resetPostLoginPermissionsState \} from ["']\.\.\/\.\.\/services\/postLoginPermissions["'];/,
      'import PermissionsApi from "../../permissions/api/permissions.api";\nconst { postLogin: { resetPostLoginPermissionsState } } = PermissionsApi;',
    )
    .replace(/\.\.\/\.\.\/navigation\//g, "../../../navigation/")
    .replace(/\.\.\/\.\.\/constants\//g, "../../../constants/")
    .replace(/\.\.\/\.\.\/config\//g, "../../../config/")
    .replace(/\.\.\/\.\.\/analytics\//g, "../../../analytics/")
    .replace(/\.\.\/\.\.\/store\//g, "../../../store/")
    .replace(/from ["']\.\.\/system["']/g, 'from "../../system"')
    .replace(/\bAuthService\b/g, "AuthApi")
    .replace(
      /await import\(["']\.\.\/steps\/steps\.thunks["']\)/,
      'await import("@/features/steps")',
    );
}

function patchEvents(content) {
  return content
    .replace(
      /import \{ apiClient \} from ["']\.\.\/\.\.\/services\/core\/apiClient\.service["'];/,
      'import EventsApi from "../api/events.api";\nconst { apiClient } = EventsApi;',
    )
    .replace(/\.\.\/\.\.\/config\//g, "../../../config/");
}

function patchSteps(content) {
  return content
    .replace(
      /import \{ StepService \} from ["']\.\.\/\.\.\/services\/step\/step\.service["'];\r?\nimport \{ GoogleFitService, HealthConnectStatus \} from ["']\.\.\/\.\.\/services\/health\/googleFit\.service["'];\r?\nimport \{ PlatformHealthService \} from ["']\.\.\/\.\.\/services\/health\/platformHealth\.service["'];\r?\nimport \{ StepTrackingPermissions \} from ["']\.\.\/\.\.\/services\/step\/stepTrackingPermissions\.service["'];/,
      `import StepsApi, { HealthConnectStatus } from "../api/steps.api";\nconst {\n  permissions: StepTrackingPermissions,\n  notificationSync: { syncStepNotificationFromStore, seedStepNotificationPayload },\n  googleFit: GoogleFitService,\n  platformHealth: PlatformHealthService,\n  ...StepService\n} = StepsApi;`,
    )
    .replace(
      /import \{ updateUser \} from ["']\.\.\/auth\/auth\.slice["'];/,
      'import { updateUser } from "@/features/auth";',
    )
    .replace(
      /import \{ syncStepNotificationFromStore \} from ["']\.\.\/\.\.\/services\/step\/stepNotificationSync\.service["'];\r?\n/,
      "",
    )
    .replace(/\.\.\/\.\.\/store\//g, "../../../store/")
    .replace(/\.\.\/\.\.\/screens\//g, "../../../screens/")
    .replace(/\.\.\/\.\.\/models\//g, "../../../models/")
    .replace(/\.\.\/\.\.\/constants\//g, "../../../constants/")
    .replace(
      /void import\(["']\.\.\/\.\.\/services\/stepRace\/stepRaceSync\.service["']\)\.then\(\(m\) =>\r?\n\s*m\.syncActiveRaceForUser\(uid, resolved\),\r?\n\s*\);/,
      `void import("@/features/stepRace").then(({ stepRaceClient }) =>\n      stepRaceClient.sync.syncActiveRaceForUser(uid, resolved),\n    );`,
    )
    .replace(
      /void import\(["']\.\.\/\.\.\/services\/stepRace\/stepRaceSync\.service["']\)\.then\(\(m\) =>\r?\n\s*m\.clearActiveRaceSyncCache\(\),\r?\n\s*\);/,
      `void import("@/features/stepRace").then(({ stepRaceClient }) =>\n      stepRaceClient.sync.clearActiveRaceSyncCache(),\n    );`,
    )
    .replace(
      /const \{ AuthService \} = await import\(["']\.\.\/\.\.\/services\/auth\/auth\.service["']\);/,
      'const { authClient: AuthService } = await import("@/features/auth");',
    )
    .replace(
      /await import\(["']\.\.\/\.\.\/provider\/stepForegroundServiceLazy["']\)/,
      'await import("../../../provider/stepForegroundServiceLazy")',
    )
    .replace(
      /const \{ seedStepNotificationPayload \} =\r?\n\s*await import\(["']\.\.\/\.\.\/services\/step\/stepNotificationSync\.service["']\);\r?\n\s*void seedStepNotificationPayload/,
      "void seedStepNotificationPayload",
    );
}

const patches = [
  ["src/features/auth/model/auth.thunks.ts", "src/features/auth/auth.thunks.ts", patchAuth],
  [
    "src/features/events/model/events.thunks.ts",
    "src/features/events/events.thunks.ts",
    patchEvents,
  ],
  ["src/features/steps/model/steps.thunks.ts", "src/features/steps/steps.thunks.ts", patchSteps],
];

for (const [destRel, headRel, patchFn] of patches) {
  const dest = path.join(ROOT, destRel);
  const content = patchFn(gitShow(headRel));
  fs.writeFileSync(dest, content, { encoding: "utf8" });
  console.log("patched:", destRel);
}
