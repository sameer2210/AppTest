export const ANDROID_PACKAGE = "com.stepwars.stepwarsnew_app";
export const IOS_APP_STORE_ID = "6776768421";
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
export const APP_STORE_URL = `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`;

export const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildStoreLinks = ({
  referrerSource = "share",
  canonicalPath = "",
  customScheme = "stron://home",
}: {
  referrerSource?: string;
  canonicalPath?: string;
  customScheme?: string;
} = {}) => {
  const cleanPath = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  const playStoreWithRef = `${PLAY_STORE_URL}&referrer=${encodeURIComponent(
    `utm_source=${referrerSource}&utm_content=${encodeURIComponent(cleanPath)}`,
  )}`;
  const schemeHostAndPath = customScheme.replace(/^stron:\/\//, "");
  const androidIntent = `intent://${schemeHostAndPath}#Intent;scheme=stron;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(
    playStoreWithRef,
  )};end`;

  return {
    playStoreWithRef,
    androidIntent,
    appStoreUrl: APP_STORE_URL,
  };
};

/**
 * Common HTML renderer for shared public pages.
 * Displays title, subtitle, details, Open in STRON CTA, and store fallback links.
 */
export const renderShareHtmlPage = ({
  title,
  subtitle,
  canonicalPath,
  customScheme,
  referrerSource,
  extraDetails = "",
  badgeText = "STRON BUSINESS",
}: {
  title: string;
  subtitle: string;
  canonicalPath: string;
  customScheme: string;
  referrerSource: string;
  extraDetails?: string;
  badgeText?: string;
}) => {
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const apiBase = String(
    process.env.PUBLIC_SHARE_BASE_URL ||
      process.env.PUBLIC_MARKETING_URL ||
      "https://stron.in",
  ).replace(/\/$/, "");

  const canonicalUrl = `${apiBase}${canonicalPath.startsWith("/") ? "" : "/"}${canonicalPath}`;
  const { playStoreWithRef, androidIntent, appStoreUrl } = buildStoreLinks({
    referrerSource,
    canonicalPath,
    customScheme,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} · STRON</title>
  <meta name="description" content="${safeSubtitle}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeSubtitle}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="al:android:url" content="${escapeHtml(customScheme)}" />
  <meta property="al:android:package" content="${ANDROID_PACKAGE}" />
  <meta property="al:android:app_name" content="STRON" />
  <meta name="apple-itunes-app" content="app-id=${IOS_APP_STORE_ID}, app-argument=${escapeHtml(customScheme)}" />
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(120% 80% at 50% 0%, #164FB8 0%, #0B1E48 45%, #05070F 100%);
      color: #fff; display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .card {
      width: 100%; max-width: 440px; background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 24px; padding: 32px 24px;
      text-align: center; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    }
    .badge {
      display: inline-block; background: #086CFF; color: #FFFFFF; font-size: 0.75rem;
      font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 4px 12px; border-radius: 999px; margin-bottom: 16px;
    }
    h1 { font-size: 1.55rem; margin: 0 0 8px; line-height: 1.25; font-weight: 800; }
    .subtitle { margin: 0 0 20px; color: rgba(255, 255, 255, 0.78); font-size: 0.95rem; line-height: 1.45; }
    .details {
      background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px; padding: 14px; margin-bottom: 24px; font-size: 0.9rem; text-align: left;
    }
    a.btn {
      display: block; text-decoration: none; border-radius: 999px; padding: 14px 20px;
      font-weight: 700; font-size: 1rem; margin-bottom: 12px; transition: opacity 0.2s ease;
    }
    a.btn:active { opacity: 0.85; }
    .primary { background: #086CFF; color: #FFFFFF; }
    .secondary { background: rgba(255, 255, 255, 0.12); color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.18); }
    .hint { font-size: 0.82rem; color: rgba(255, 255, 255, 0.52); margin-top: 14px; }
  </style>
</head>
<body>
  <main class="card">
    <div class="badge">${escapeHtml(badgeText)}</div>
    <h1>${safeTitle}</h1>
    <p class="subtitle">${safeSubtitle}</p>
    ${extraDetails ? `<div class="details">${extraDetails}</div>` : ""}
    <a class="btn primary" id="openApp" href="${escapeHtml(customScheme)}">Open in STRON</a>
    <a class="btn secondary" id="storeBtn" href="${escapeHtml(playStoreWithRef)}">Download on Google Play</a>
    <a class="btn secondary" id="iosStoreBtn" href="${appStoreUrl}" style="display:none">Download on App Store</a>
    <p class="hint" id="hint">Opening STRON… If nothing happens, tap the button above or download the app.</p>
  </main>
  <script>
    (function () {
      var custom = ${JSON.stringify(customScheme)};
      var intent = ${JSON.stringify(androidIntent)};
      var playStore = ${JSON.stringify(playStoreWithRef)};
      var appStore = ${JSON.stringify(appStoreUrl)};
      var ua = navigator.userAgent || "";
      var isAndroid = /Android/i.test(ua);
      var isIOS = /iPhone|iPad|iPod/i.test(ua);
      var storeUrl = isIOS ? appStore : playStore;
      var opened = false;

      var storeBtn = document.getElementById("storeBtn");
      var iosBtn = document.getElementById("iosStoreBtn");
      var openBtn = document.getElementById("openApp");
      var hint = document.getElementById("hint");

      if (isIOS) {
        if (storeBtn) storeBtn.style.display = "none";
        if (iosBtn) {
          iosBtn.style.display = "block";
          iosBtn.href = appStore;
        }
        if (openBtn) openBtn.href = custom;
      } else if (isAndroid) {
        if (openBtn) openBtn.href = intent;
        if (storeBtn) storeBtn.href = playStore;
      }

      function goStore() {
        if (opened || document.hidden) return;
        if (hint) hint.textContent = "App not installed — taking you to the store…";
        window.location.href = storeUrl;
      }

      function tryOpenApp() {
        var target = isAndroid ? intent : custom;
        window.location.href = target;
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) opened = true;
      });
      window.addEventListener("pagehide", function () { opened = true; });
      window.addEventListener("blur", function () { opened = true; });

      if (isAndroid || isIOS) {
        setTimeout(tryOpenApp, 250);
        setTimeout(goStore, 1900);
      } else if (hint) {
        hint.textContent = "Open this link on your phone to view in the STRON app.";
      }
    })();
  </script>
</body>
</html>`;
};
