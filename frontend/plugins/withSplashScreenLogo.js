/**
 * Splash + brand assets for Android.
 * - Splash: assets/logo/logo.png
 * - Notification smallIcon: white silhouette PNG (plugins/native/res/drawable/notification_icon.png)
 * - Notification largeIcon badge: white S on blue (stron_notification_logo.png)
 */
const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

const LOGO_REL = "assets/logo/logo.png";
const ANDROID_DRAWABLE_DIRS = [
  "drawable",
  "drawable-mdpi",
  "drawable-hdpi",
  "drawable-xhdpi",
  "drawable-xxhdpi",
  "drawable-xxxhdpi",
];

const copyBrandLogos = (projectRoot, androidRoot) => {
  const srcLogo = path.join(projectRoot, LOGO_REL);
  const pluginDrawable = path.join(__dirname, "native", "res", "drawable");
  const whiteIcon = path.join(pluginDrawable, "notification_icon.png");
  const blueBadge = path.join(pluginDrawable, "stron_notification_logo.png");

  if (!fs.existsSync(srcLogo)) {
    console.warn(`[withSplashScreenLogo] Missing ${LOGO_REL}`);
    return;
  }

  const androidRes = path.join(androidRoot, "app", "src", "main", "res");
  for (const dir of ANDROID_DRAWABLE_DIRS) {
    const destDir = path.join(androidRes, dir);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(srcLogo, path.join(destDir, "splashscreen_logo.png"));

    // Prefer generated white-on-blue badge / white silhouette — never the raw black-bg PNG.
    if (fs.existsSync(blueBadge)) {
      fs.copyFileSync(blueBadge, path.join(destDir, "stron_notification_logo.png"));
    }
    const logoXml = path.join(destDir, "stron_notification_logo.xml");
    if (fs.existsSync(logoXml)) fs.unlinkSync(logoXml);

    if (fs.existsSync(whiteIcon)) {
      fs.copyFileSync(whiteIcon, path.join(destDir, "notification_icon.png"));
    }
    const iconXml = path.join(destDir, "notification_icon.xml");
    if (fs.existsSync(iconXml)) fs.unlinkSync(iconXml);
  }
};

const withSplashScreenLogo = (config) =>
  withDangerousMod(config, [
    "android",
    async (cfg) => {
      copyBrandLogos(cfg.modRequest.projectRoot, cfg.modRequest.platformProjectRoot);
      return cfg;
    },
  ]);

module.exports = withSplashScreenLogo;
