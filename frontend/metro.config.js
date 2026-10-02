const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Keep common image formats resolvable after asset renames (png → jpg on develop).
for (const ext of ["jpg", "jpeg", "png", "webp", "gif"]) {
  if (!config.resolver.assetExts.includes(ext)) {
    config.resolver.assetExts.push(ext);
  }
}

const escapeRegExp = (value) => value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
const projectRoot = __dirname;

// Scope to native project dirs only — unanchored `/ios\/.*/` also blocks `node_modules/axios/**`.
config.resolver.blockList = [
  new RegExp(`^${escapeRegExp(path.join(projectRoot, "android"))}[\\\\/].*`),
  new RegExp(`^${escapeRegExp(path.join(projectRoot, "ios"))}[\\\\/].*`),
  new RegExp(`^${escapeRegExp(projectRoot)}[\\\\/].*\\.cxx[\\\\/].*`),
];

module.exports = withNativeWind(config, { input: "./global.css" });
