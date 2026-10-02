import fs from "fs";
import path from "path";
import { globSync } from "glob";

const SRC = path.resolve("src/features");

const CLIENT_HOOKS = {
  auth: "ui/hooks/useAuthClient",
  steps: "ui/hooks/useStepsClient",
  managedEvents: "ui/hooks/useManagedEventsClient",
  gymBusiness: "ui/hooks/useGymBusinessClient",
  payments: "ui/hooks/usePaymentsClient",
  connect: "ui/hooks/useConnectClient",
  notifications: "ui/hooks/useNotificationsClient",
  stepRace: "ui/hooks/useStepRaceClient",
  user: "ui/hooks/useUserClient",
  core: "ui/hooks/useCoreClient",
  permissions: "ui/hooks/usePermissionsClient",
};

const MANUAL_EXPORTS = {
  managedEvents: {
    formatEventProgressData: "ui/shared/formatters",
    formatCompactEventDateRange: "ui/shared/formatters",
    buildFormatGameRules: "ui/shared/formatGameRules",
  },
  explore: {
    LocationPickerModal: "ui/explore/components/LocationPickerModal",
    EXPLORE_NOTCH_SEARCH_GAP: "ui/explore/exploreLayout",
    EXPLORE_SEARCH_BAR_HEIGHT: "ui/explore/exploreLayout",
    getExploreStickySearchPaddingTop: "ui/explore/exploreLayout",
    getExploreStickySearchContentOffset: "ui/explore/exploreLayout",
  },
  auth: {
    AuthModal: "ui/components/AuthModal",
    AuthModalStep: "ui/components/AuthModal",
    AuthModalProvider: "ui/components/AuthModalContext",
    useAuthModal: "ui/components/AuthModalContext",
    useRequireAuth: "ui/components/AuthModalContext",
    LoginScreen: "ui/screens/LoginScreen",
    OnboardingScreen: "ui/screens/OnboardingScreen",
    PreferencesScreen: "ui/screens/PreferencesScreen",
    ProfileCompletionScreen: "ui/screens/ProfileCompletionScreen",
  },
  gymBusiness: {
    useProSubscription: "ui/hooks/useProSubscription",
  },
};

function collectExportsFromFile(relPath, content) {
  const found = [];
  const patterns = [
    /export\s+(?:type\s+)?(?:const|function|class|enum|interface)\s+(\w+)/g,
    /export\s+type\s+\{([^}]+)\}/g,
  ];

  for (const regex of patterns) {
    for (const match of content.matchAll(regex)) {
      if (regex.source.includes("\\{")) {
        for (const part of match[1].split(",")) {
          const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
          if (name) found.push(name);
        }
      } else {
        found.push(match[1]);
      }
    }
  }

  for (const match of content.matchAll(/export\s+\{([^}]+)\}/g)) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      if (!trimmed || trimmed.startsWith("default")) continue;
      const name = trimmed
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)[0]
        .trim();
      if (name) found.push(name);
    }
  }

  return found.map((name) => ({ name, relPath }));
}

function buildExportMap(featureName) {
  const featureRoot = path.join(SRC, featureName);
  if (!fs.existsSync(featureRoot)) return new Map();

  const exportMap = new Map();

  for (const manual of Object.entries(MANUAL_EXPORTS[featureName] ?? {})) {
    exportMap.set(manual[0], manual[1]);
  }

  const clientHook = CLIENT_HOOKS[featureName];
  if (clientHook) {
    const hookPath = path.join(featureRoot, `${clientHook}.ts`);
    if (fs.existsSync(hookPath)) {
      const content = fs.readFileSync(hookPath, "utf8");
      for (const { name } of collectExportsFromFile(clientHook, content)) {
        exportMap.set(name, clientHook);
      }
    }
  }

  const files = globSync("{model,api,ui}/**/*.{ts,tsx}", {
    cwd: featureRoot,
    absolute: false,
  });

  for (const rel of files) {
    if (rel.includes("/hooks/use") && rel.endsWith("Client.ts")) continue;
    const content = fs.readFileSync(path.join(featureRoot, rel), "utf8");
    for (const { name } of collectExportsFromFile(rel, content)) {
      if (!exportMap.has(name)) {
        exportMap.set(name, rel.replace(/\.tsx?$/, ""));
      }
    }
  }

  return exportMap;
}

function normalizeImportPath(fromDir, targetRel) {
  const rel = path.relative(fromDir, path.join(SRC, targetRel.split("/")[0], targetRel.slice(targetRel.indexOf("/") + 1)));
  // targetRel is like "auth/ui/hooks/useAuthClient" - need feature-relative path
  return null;
}

function toImportPath(fromFile, featureName, targetWithinFeature) {
  const fromDir = path.dirname(fromFile);
  const targetAbs = path.join(SRC, featureName, targetWithinFeature);
  let rel = path.relative(fromDir, targetAbs).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

function rewriteImports(filePath, featureName, exportMap) {
  let content = fs.readFileSync(filePath, "utf8");
  const barrel = `@/features/${featureName}`;
  if (!content.includes(barrel)) return false;

  const importRegex = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+["']@\/features\/([^"']+)["'];?/g;
  let changed = false;
  const replacements = [];

  for (const match of content.matchAll(importRegex)) {
    if (match[3] !== featureName) continue;

    const isTypeOnly = Boolean(match[1]);
    const specifiers = match[2]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const groups = new Map();

    for (const spec of specifiers) {
      const typePrefix = spec.startsWith("type ") ? "type " : "";
      const core = spec.replace(/^type\s+/, "").trim();
      const aliasMatch = core.match(/^(\w+)\s+as\s+(\w+)$/);
      const exportName = aliasMatch ? aliasMatch[1] : core;
      const target = exportMap.get(exportName);

      if (!target) {
        console.warn(`  [${featureName}] unknown export "${exportName}" in ${path.relative(process.cwd(), filePath)}`);
        continue;
      }

      const key = target;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(`${typePrefix}${spec}`);
    }

    if (groups.size === 0) continue;

    const newImports = [...groups.entries()].map(([target, names]) => {
      const importPath = toImportPath(filePath, featureName, target);
      return `${isTypeOnly ? "import type" : "import"} { ${names.join(", ")} } from "${importPath}";`;
    });

    replacements.push({ original: match[0], replacement: newImports.join("\n") });
  }

  for (const { original, replacement } of replacements) {
    content = content.replace(original, replacement);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
  }
  return changed;
}

const features = fs.readdirSync(SRC).filter((name) => fs.statSync(path.join(SRC, name)).isDirectory());

for (const featureName of features) {
  const exportMap = buildExportMap(featureName);
  const files = globSync("**/*.{ts,tsx}", {
    cwd: path.join(SRC, featureName),
    absolute: true,
  });

  let count = 0;
  for (const file of files) {
    if (rewriteImports(file, featureName, exportMap)) {
      count += 1;
      console.log(`fixed [${featureName}]:`, path.relative(process.cwd(), file));
    }
  }
  if (count === 0) {
    console.log(`ok [${featureName}]: no internal barrel imports`);
  }
}

console.log("done");
