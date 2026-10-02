const fs = require("fs");
const path = require("path");
const { withAppBuildGradle, withDangerousMod } = require("@expo/config-plugins");

const MARKER = "// @generated begin exclude-ads-mobile-sdk";
const GRADLEW_CMAKE_MARKER = "@rem @generated begin cmake-version-fix";
const JVMARGS_MARKER = "# @generated stron-gradle-memory";
const WINDOWS_CMAKE_VERSION = "3.31.6";
// Dex merge (mergeExtDex*) OOMs at 2g with Firebase + Play Services + Expo deps.
// Cap at 3g for 8GB machines; raise further only if mergeExtDex still OOMs.
const GRADLE_JVMARGS =
  "org.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=768m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8";
const GRADLE_WORKERS_MARKER = "# @generated stron-gradle-workers";
const GRADLE_WORKERS_LINE = "org.gradle.workers.max=2";

const parseVersionParts = (version) =>
  version.split(".").map((part) => Number.parseInt(part, 10) || 0);

const compareVersions = (left, right) => {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }

  return 0;
};

const hasCmakeBinary = (cmakeRoot, version) => {
  const cmakeBin = path.join(cmakeRoot, version, "bin", "cmake");
  const cmakeExe = `${cmakeBin}.exe`;
  return fs.existsSync(cmakeBin) || fs.existsSync(cmakeExe);
};

const resolveInstalledCmakeVersion = (sdkDir) => {
  const cmakeRoot = path.join(sdkDir, "cmake");
  if (!fs.existsSync(cmakeRoot)) {
    return null;
  }

  const installedVersions = fs
    .readdirSync(cmakeRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((version) => hasCmakeBinary(cmakeRoot, version))
    .sort(compareVersions);

  if (installedVersions.length === 0) {
    return null;
  }

  const cmake3Versions = installedVersions.filter((version) => version.startsWith("3."));
  if (cmake3Versions.length > 0) {
    return cmake3Versions[cmake3Versions.length - 1];
  }

  return installedVersions[installedVersions.length - 1];
};

const resolveCmakeVersion = (sdkDir) => {
  if (process.platform === "darwin") {
    return resolveInstalledCmakeVersion(sdkDir);
  }

  return WINDOWS_CMAKE_VERSION;
};

/**
 * Keeps Android builds lean by excluding Firebase Analytics' transitive ads-mobile-sdk.
 */
const withExcludeAdsMobileSdk = (config) => {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      return cfg;
    }
    if (cfg.modResults.contents.includes(MARKER)) {
      return cfg;
    }
    const block = `
${MARKER}
configurations.configureEach {
    exclude group: 'com.google.android.libraries.ads.mobile.sdk', module: 'ads-mobile-sdk'
}
// @generated end exclude-ads-mobile-sdk
`;
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /^dependencies \{/m,
      `${block}\ndependencies {`,
    );
    return cfg;
  });
};

const withGradlewCmakeVersion = (config) => {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      if (process.platform === "darwin") {
        return cfg;
      }

      const gradlewPath = path.join(cfg.modRequest.platformProjectRoot, "gradlew.bat");
      if (!fs.existsSync(gradlewPath)) {
        return cfg;
      }
      let contents = fs.readFileSync(gradlewPath, "utf8");
      if (!contents.includes(GRADLEW_CMAKE_MARKER)) {
        contents = contents.replace(
          '@if "%DEBUG%"=="" @echo off\r\n',
          `@if "%DEBUG%"=="" @echo off\r\n@rem @generated begin cmake-version-fix\r\nset CMAKE_VERSION=${WINDOWS_CMAKE_VERSION}\r\n@rem @generated end cmake-version-fix\r\n`,
        );
        fs.writeFileSync(gradlewPath, contents);
      }
      return cfg;
    },
  ]);
};

const withLocalProperties = (config) => {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const sdkDir = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
      if (!sdkDir) {
        return cfg;
      }

      const localPropertiesPath = path.join(cfg.modRequest.platformProjectRoot, "local.properties");
      const escapedSdkDir = sdkDir.replace(/\\/g, "\\\\");
      const lines = [`sdk.dir=${escapedSdkDir}`];

      fs.writeFileSync(localPropertiesPath, `${lines.join("\n")}\n`);
      return cfg;
    },
  ]);
};

// Persist higher heap/Metaspace across expo prebuild (2g heap OOMs on mergeExtDex).
const withGradleJvmArgs = (config) => {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const gradlePropsPath = path.join(cfg.modRequest.platformProjectRoot, "gradle.properties");
      if (!fs.existsSync(gradlePropsPath)) {
        return cfg;
      }
      let contents = fs.readFileSync(gradlePropsPath, "utf8");
      if (contents.includes(JVMARGS_MARKER)) {
        contents = contents.replace(
          new RegExp(`${JVMARGS_MARKER}\\norg\\.gradle\\.jvmargs=.*`),
          `${JVMARGS_MARKER}\n${GRADLE_JVMARGS}`,
        );
      } else if (/^org\.gradle\.jvmargs=/m.test(contents)) {
        contents = contents.replace(
          /^org\.gradle\.jvmargs=.*$/m,
          `${JVMARGS_MARKER}\n${GRADLE_JVMARGS}`,
        );
      } else {
        contents = `${contents.trimEnd()}\n\n${JVMARGS_MARKER}\n${GRADLE_JVMARGS}\n`;
      }

      // Limit concurrent workers so dex merge has headroom on 8GB machines.
      if (contents.includes(GRADLE_WORKERS_MARKER)) {
        contents = contents.replace(
          new RegExp(`${GRADLE_WORKERS_MARKER}\\norg\\.gradle\\.workers\\.max=.*`),
          `${GRADLE_WORKERS_MARKER}\n${GRADLE_WORKERS_LINE}`,
        );
      } else if (/^org\.gradle\.workers\.max=/m.test(contents)) {
        contents = contents.replace(
          /^org\.gradle\.workers\.max=.*$/m,
          `${GRADLE_WORKERS_MARKER}\n${GRADLE_WORKERS_LINE}`,
        );
      } else {
        contents = contents.replace(
          `${JVMARGS_MARKER}\n${GRADLE_JVMARGS}`,
          `${JVMARGS_MARKER}\n${GRADLE_JVMARGS}\n${GRADLE_WORKERS_MARKER}\n${GRADLE_WORKERS_LINE}`,
        );
      }

      fs.writeFileSync(gradlePropsPath, contents);
      return cfg;
    },
  ]);
};

module.exports = (config) => {
  config = withExcludeAdsMobileSdk(config);
  // config = withGradlewCmakeVersion(config);
  config = withLocalProperties(config);
  config = withGradleJvmArgs(config);
  return config;
};
