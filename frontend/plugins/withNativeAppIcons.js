/**
 * Copies pre-generated native launcher icons from assets/icon-android and
 * assets/icon-ios into the prebuild output (overrides Expo-generated icons).
 *
 * Run `npx expo prebuild` after changing icon assets.
 */
const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

const LAUNCHER_RESOURCE_NAMES = new Set([
  "ic_launcher",
  "ic_launcher_foreground",
  "ic_launcher_round",
  "ic_launcher_background",
  "ic_launcher_monochrome",
]);

const removeExpoLauncherWebp = (mipmapDir) => {
  if (!fs.existsSync(mipmapDir)) {
    return;
  }
  for (const file of fs.readdirSync(mipmapDir)) {
    if (!file.endsWith(".webp")) {
      continue;
    }
    const baseName = file.slice(0, -".webp".length);
    if (LAUNCHER_RESOURCE_NAMES.has(baseName)) {
      fs.unlinkSync(path.join(mipmapDir, file));
    }
  }
};

const copyDirRecursive = (srcDir, destDir) => {
  if (!fs.existsSync(srcDir)) {
    return;
  }
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

const removeConflictingLauncherResources = (srcDir, destDir) => {
  if (!fs.existsSync(srcDir) || !fs.existsSync(destDir)) {
    return;
  }

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      removeConflictingLauncherResources(
        path.join(srcDir, entry.name),
        path.join(destDir, entry.name),
      );
      continue;
    }

    const parsed = path.parse(entry.name);
    if (!parsed.name.startsWith("ic_launcher")) {
      continue;
    }

    for (const extension of [".png", ".webp", ".xml"]) {
      const staleResourcePath = path.join(destDir, `${parsed.name}${extension}`);
      if (fs.existsSync(staleResourcePath)) {
        fs.rmSync(staleResourcePath, { force: true });
      }
    }
  }
};

const findAppIconAppiconset = (rootDir) => {
  if (!fs.existsSync(rootDir)) {
    return null;
  }

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.name === "AppIcon.appiconset") {
        return fullPath;
      }
      const nested = walk(fullPath);
      if (nested) {
        return nested;
      }
    }
    return null;
  };

  return walk(rootDir);
};

const ANDROID_ICON_DIRS = [
  "mipmap-anydpi-v26",
  "mipmap-hdpi",
  "mipmap-ldpi",
  "mipmap-mdpi",
  "mipmap-xhdpi",
  "mipmap-xxhdpi",
  "mipmap-xxxhdpi",
  "values",
];

const withAndroidNativeIcons = (config) =>
  withDangerousMod(config, [
    "android",
    async (cfg) => {
      const srcRoot = path.join(cfg.modRequest.projectRoot, "assets", "icon-android");
      const destResDir = path.join(cfg.modRequest.platformProjectRoot, "app/src/main/res");

      for (const dirName of ANDROID_ICON_DIRS) {
        const srcDir = path.join(srcRoot, dirName);
        const destDir = path.join(destResDir, dirName);
        removeConflictingLauncherResources(srcDir, destDir);
        if (dirName.startsWith("mipmap-")) {
          // Remove pre-existing Expo-generated launcher webp before copying our custom android icons.
          removeExpoLauncherWebp(destDir);
        }
        copyDirRecursive(srcDir, destDir);
      }

      return cfg;
    },
  ]);

const withIosNativeIcons = (config) =>
  withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const srcIconSet = path.join(
        cfg.modRequest.projectRoot,
        "assets",
        "icon-ios",
        "AppIcon.appiconset",
      );
      const destIconSet = findAppIconAppiconset(cfg.modRequest.platformProjectRoot);

      if (!fs.existsSync(srcIconSet)) {
        console.warn("[withNativeAppIcons] iOS source AppIcon.appiconset not found — skipping.");
        return cfg;
      }

      if (!destIconSet) {
        console.warn(
          "[withNativeAppIcons] iOS destination AppIcon.appiconset not found — skipping.",
        );
        return cfg;
      }

      copyDirRecursive(srcIconSet, destIconSet);
      return cfg;
    },
  ]);

module.exports = (config) => {
  config = withAndroidNativeIcons(config);
  config = withIosNativeIcons(config);
  return config;
};
