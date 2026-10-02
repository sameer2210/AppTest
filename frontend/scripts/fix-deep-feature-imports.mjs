import fs from "fs";
import path from "path";
import { globSync } from "glob";

const SRC = path.resolve("src");
const FEATURES = path.join(SRC, "features");

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
    hydrateExplorePreferences: "model/explore.thunks",
    initializeExploreLocation: "model/explore.thunks",
    resolveCurrentLocation: "model/explore.thunks",
    fetchExploreResults: "model/explore.thunks",
    searchExploreCities: "model/explore.thunks",
    toggleExploreBookmark: "model/explore.slice",
    setRadiusKm: "model/explore.slice",
    setExploreFilters: "model/explore.slice",
    setExploreSort: "model/explore.slice",
    setSearchQuery: "model/explore.slice",
    resetExploreFilters: "model/explore.slice",
    clearExploreError: "model/explore.slice",
    addRecentCity: "model/explore.slice",
    loadLocationPickerSuggestions: "model/explore.thunks",
    resolveGpsLocationSuggestion: "model/explore.thunks",
    searchLocationSuggestions: "model/explore.thunks",
  },
  auth: {
    AuthModal: "ui/components/AuthModal",
    AuthModalStep: "ui/components/AuthModal",
    AuthModalProvider: "ui/components/AuthModalContext",
    useAuthModal: "ui/components/AuthModalContext",
    useRequireAuth: "ui/components/AuthModalContext",
    bootstrapAuth: "model/auth.thunks",
    completeLogin: "model/auth.thunks",
    signOutUser: "model/auth.thunks",
    sendOtp: "model/auth.thunks",
  },
  gymBusiness: {
    useProSubscription: "ui/hooks/useProSubscription",
  },
  events: {
    setSelectedCity: "model/events.slice",
  },
  system: {
    setLoaderStatus: "model/system.slice",
  },
};

function collectExportsFromFile(relPath, content) {
  const found = [];
  for (const match of content.matchAll(/export\s+(?:type\s+)?(?:const|function|class|enum|interface)\s+(\w+)/g)) {
    found.push(match[1]);
  }
  for (const match of content.matchAll(/export\s+\{([^}]+)\}/g)) {
    for (const part of match[1].split(",")) {
      const trimmed = part.trim();
      if (!trimmed || trimmed.startsWith("default")) continue;
      const name = trimmed.replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
      if (name) found.push(name);
    }
  }
  return found.map((name) => ({ name, relPath }));
}

function buildExportMap(featureName) {
  const featureRoot = path.join(FEATURES, featureName);
  if (!fs.existsSync(featureRoot)) return new Map();

  const exportMap = new Map();
  for (const [name, target] of Object.entries(MANUAL_EXPORTS[featureName] ?? {})) {
    exportMap.set(name, target);
  }

  const clientHook = CLIENT_HOOKS[featureName];
  if (clientHook) {
    const hookFile = path.join(featureRoot, `${clientHook}.ts`);
    if (fs.existsSync(hookFile)) {
      for (const { name } of collectExportsFromFile(clientHook, fs.readFileSync(hookFile, "utf8"))) {
        exportMap.set(name, clientHook);
      }
    }
  }

  for (const rel of globSync("{model,api,ui}/**/*.{ts,tsx}", { cwd: featureRoot })) {
    if (rel.includes("/hooks/use") && rel.endsWith("Client.ts")) continue;
    const content = fs.readFileSync(path.join(featureRoot, rel), "utf8");
    for (const { name } of collectExportsFromFile(rel, content)) {
      if (!exportMap.has(name)) exportMap.set(name, rel.replace(/\.tsx?$/, ""));
    }
  }

  return exportMap;
}

const exportMaps = new Map(
  fs
    .readdirSync(FEATURES)
    .filter((name) => fs.statSync(path.join(FEATURES, name)).isDirectory())
    .map((name) => [name, buildExportMap(name)]),
);

function toImportPath(fromFile, featureName, targetWithinFeature) {
  const rel = path
    .relative(path.dirname(fromFile), path.join(FEATURES, featureName, targetWithinFeature))
    .replace(/\\/g, "/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

function rewriteFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const importRegex = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+["']@\/features\/([^"']+)["'];?/g;
  let changed = false;
  const replacements = [];

  for (const match of content.matchAll(importRegex)) {
    const featureName = match[3];
    const exportMap = exportMaps.get(featureName);
    if (!exportMap) continue;

    const fileFeature = filePath.includes(path.join("features", featureName));
    // Always rewrite cross-feature; also rewrite same-feature to break barrel cycles.
    if (!fileFeature && !match[0].includes("Client")) {
      // still rewrite cross-feature for thunks/selectors used at module init
    }

    const isTypeOnly = Boolean(match[1]);
    const specifiers = match[2]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    const groups = new Map();
    let unresolved = [];

    for (const spec of specifiers) {
      const typePrefix = spec.startsWith("type ") ? "type " : "";
      const core = spec.replace(/^type\s+/, "").trim();
      const exportName = core.split(/\s+as\s+/)[0].trim();
      const target = exportMap.get(exportName);
      if (!target) {
        unresolved.push(spec);
        continue;
      }
      if (!groups.has(target)) groups.set(target, []);
      groups.get(target).push(`${typePrefix}${spec}`);
    }

    if (groups.size === 0) continue;

    const newImports = [...groups.entries()].map(([target, names]) => {
      const importPath = toImportPath(filePath, featureName, target);
      const onlyTypes = names.every((name) => name.startsWith("type "));
      const keyword = isTypeOnly || onlyTypes ? "import type" : "import";
      return `${keyword} { ${names.join(", ")} } from "${importPath}";`;
    });

    if (unresolved.length) {
      newImports.push(
        `${isTypeOnly ? "import type" : "import"} { ${unresolved.join(", ")} } from "@/features/${featureName}";`,
      );
    }

    replacements.push({ original: match[0], replacement: newImports.join("\n") });
  }

  for (const { original, replacement } of replacements) {
    content = content.replace(original, replacement);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log("fixed:", path.relative(process.cwd(), filePath));
  }
}

for (const file of globSync("**/*.{ts,tsx}", { cwd: SRC, absolute: true })) {
  if (file.includes(`${path.sep}features${path.sep}lib${path.sep}`)) continue;
  rewriteFile(file);
}

console.log("done");
