/**
 * Copies plugins/storekit/StronPro.storekit into the iOS app folder on prebuild
 * and wires it to the shared Xcode scheme for Simulator StoreKit testing.
 *
 * Without this, RevenueCat cannot resolve iOS IAP SKUs on Simulator because
 * App Store Connect products are not available unless a StoreKit config is attached.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { withDangerousMod } = require("@expo/config-plugins");

const STOREKIT_FILENAME = "StronPro.storekit";
const SOURCE_RELATIVE = path.join("plugins", "storekit", STOREKIT_FILENAME);

const randomPbxId = () =>
  crypto.randomBytes(12).toString("hex").toUpperCase().slice(0, 24);

const patchScheme = (schemePath, storeKitIdentifier) => {
  let xml = fs.readFileSync(schemePath, "utf8");
  if (xml.includes("StoreKitConfigurationFileReference")) {
    return;
  }

  const insertion = `      <StoreKitConfigurationFileReference
         identifier = "${storeKitIdentifier}">
      </StoreKitConfigurationFileReference>
`;

  const patched = xml.replace(
    /(<LaunchAction[^>]*>\n)(      <BuildableProductRunnable)/,
    `$1${insertion}$2`,
  );

  if (patched === xml) {
    throw new Error(`Failed to patch LaunchAction in ${schemePath}`);
  }

  fs.writeFileSync(schemePath, patched);
};

const patchPbxproj = (pbxPath, fileRefId, appName) => {
  let pbx = fs.readFileSync(pbxPath, "utf8");
  if (pbx.includes(STOREKIT_FILENAME)) {
    return;
  }

  const fileRefLine = `\t\t${fileRefId} /* ${STOREKIT_FILENAME} */ = {isa = PBXFileReference; lastKnownFileType = text; name = ${STOREKIT_FILENAME}; path = ${appName}/${STOREKIT_FILENAME}; sourceTree = "<group>"; };`;

  pbx = pbx.replace(
    "/* End PBXFileReference section */",
    `${fileRefLine}\n/* End PBXFileReference section */`,
  );

  const groupHeaderRegex = new RegExp(
    `(\\w+) /\\* ${appName} \\*/ = \\{\\s+isa = PBXGroup;\\s+children = \\(\\s+`,
  );

  if (!pbx.match(groupHeaderRegex)) {
    throw new Error(`Could not find PBXGroup for ${appName} in ${pbxPath}`);
  }

  pbx = pbx.replace(
    groupHeaderRegex,
    `$1 /* ${appName} */ = {\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t${fileRefId} /* ${STOREKIT_FILENAME} */,\n\t\t\t\t`,
  );

  fs.writeFileSync(pbxPath, pbx);
};

const applyStoreKitConfig = ({ projectRoot, platformRoot, appName }) => {
  const src = path.join(projectRoot, SOURCE_RELATIVE);
  if (!fs.existsSync(src)) {
    throw new Error(`Missing StoreKit source at ${SOURCE_RELATIVE}`);
  }

  const dest = path.join(platformRoot, appName, STOREKIT_FILENAME);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);

  const storeKitIdentifier = `${appName}/${STOREKIT_FILENAME}`;
  const schemePath = path.join(
    platformRoot,
    `${appName}.xcodeproj`,
    "xcshareddata",
    "xcschemes",
    `${appName}.xcscheme`,
  );

  if (fs.existsSync(schemePath)) {
    patchScheme(schemePath, storeKitIdentifier);
  }

  const pbxPath = path.join(platformRoot, `${appName}.xcodeproj`, "project.pbxproj");
  if (fs.existsSync(pbxPath)) {
    patchPbxproj(pbxPath, randomPbxId(), appName);
  }
};

module.exports = (config) =>
  withDangerousMod(config, [
    "ios",
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const appName = cfg.modRequest.projectName || "STRON";

      applyStoreKitConfig({ projectRoot, platformRoot, appName });
      return cfg;
    },
  ]);

module.exports.applyStoreKitConfig = applyStoreKitConfig;
module.exports.STOREKIT_FILENAME = STOREKIT_FILENAME;
