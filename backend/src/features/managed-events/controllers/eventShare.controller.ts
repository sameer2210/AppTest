import type { NextFunction, Request, Response } from "express";
import { getEventByKey } from "../services/stronEvent.service.js";

const ANDROID_PACKAGE = "com.stepwars.stepwarsnew_app";
const IOS_APP_STORE_ID = "6776768421";
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
const APP_STORE_URL = `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`;

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Public smart-link for shared events.
 * Tries to open the STRON app; if not installed, falls back to the store.
 * Served at both /event/:key and /api/event/:key (nginx typically only proxies /api).
 */
export const openSharedEventPage = async (req: Request, res: Response) => {
  const key = String(req.params.key || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
  
  if (!key) {
    return res.status(404).type("html").send(
      renderPage({
        title: "Event not found",
        subtitle: "This territory hasn't been captured yet.",
        eventKey: "",
      }),
    );
  }

  const ua = req.headers["user-agent"] || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  const playStoreWithRef = `${PLAY_STORE_URL}&referrer=${encodeURIComponent(`utm_source=event_share&utm_content=${key}`)}`;
  const androidIntent = `intent://event/${encodeURIComponent(key)}#Intent;scheme=stron;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(playStoreWithRef)};end`;

  // If the request reached the server on a mobile device, it means App Links/Universal Links failed,
  // which almost always means the app is not installed. We immediately redirect to the stores.
  if (isIOS) {
    return res.redirect(302, APP_STORE_URL);
  }
  
  if (isAndroid) {
    // Android Chrome natively parses the intent URI and will route to the Play Store
    // automatically if the app is missing (via browser_fallback_url).
    return res.redirect(302, androidIntent);
  }

  let title = "STRON Event";
  let subtitle = "Open in the STRON app to join this challenge.";
  try {
    const event = await getEventByKey(key);
    if (event?.title) {
      title = String(event.title);
      subtitle =
        event.status === "cancelled"
          ? "This event was cancelled."
          : "Open in the STRON app to view and join.";
    }
  } catch {
    // Still render open-app page even if DB lookup fails.
  }

  return res.status(200).type("html").send(
    renderPage({
      title,
      subtitle,
      eventKey: key,
    }),
  );
};

const renderPage = ({
  title,
  subtitle,
  eventKey,
}: {
  title: string;
  subtitle: string;
  eventKey: string;
}) => {
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const apiBase = String(process.env.PUBLIC_API_BASE_URL || "https://api.stron.in").replace(
    /\/$/,
    "",
  );
  // Prefer /api/event so the page works behind nginx that only proxies /api/*.
  const canonicalUrl = eventKey
    ? `${apiBase}/api/event/${encodeURIComponent(eventKey)}`
    : apiBase;
  const customScheme = eventKey
    ? `stron://event/${encodeURIComponent(eventKey)}`
    : "stron://home";
  const playStoreWithRef = eventKey
    ? `${PLAY_STORE_URL}&referrer=${encodeURIComponent(`utm_source=event_share&utm_content=${eventKey}`)}`
    : PLAY_STORE_URL;
  // Android Intent: opens app if installed, otherwise browser_fallback_url (Play Store).
  const androidIntent = eventKey
    ? `intent://event/${encodeURIComponent(eventKey)}#Intent;scheme=stron;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(playStoreWithRef)};end`
    : playStoreWithRef;

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
  <meta name="apple-itunes-app" content="app-id=${IOS_APP_STORE_ID}${eventKey ? `, app-argument=${escapeHtml(customScheme)}` : ""}" />
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; min-height: 100vh; font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      background: radial-gradient(120% 80% at 50% 0%, #1a3a8f 0%, #0b1020 55%, #05070f 100%);
      color: #fff; display: flex; align-items: center; justify-content: center; padding: 24px;
    }
    .card {
      width: 100%; max-width: 420px; background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 28px 22px;
      text-align: center; backdrop-filter: blur(10px);
    }
    h1 { font-size: 1.45rem; margin: 0 0 10px; line-height: 1.25; }
    p { margin: 0 0 22px; color: rgba(255,255,255,0.72); line-height: 1.45; }
    a.btn {
      display: block; text-decoration: none; border-radius: 999px; padding: 14px 18px;
      font-weight: 600; margin-bottom: 12px;
    }
    .primary { background: #086cff; color: #fff; }
    .secondary { background: rgba(255,255,255,0.1); color: #fff; }
    .hint { font-size: 0.85rem; color: rgba(255,255,255,0.5); margin-top: 8px; }
  </style>
</head>
<body>
  <main class="card">
    <h1>${safeTitle}</h1>
    <p>${safeSubtitle}</p>
    <a class="btn primary" id="openApp" href="${escapeHtml(customScheme)}">Open in STRON</a>
    <a class="btn secondary" id="storeBtn" href="${escapeHtml(playStoreWithRef)}">Download on Google Play</a>
    <a class="btn secondary" id="iosStoreBtn" href="${APP_STORE_URL}" style="display:none">Download on the App Store</a>
    <p class="hint" id="hint">Opening STRON… If nothing happens, download the app below.</p>
  </main>
  <script>
    (function () {
      var custom = ${JSON.stringify(customScheme)};
      var intent = ${JSON.stringify(androidIntent)};
      var playStore = ${JSON.stringify(playStoreWithRef)};
      var appStore = ${JSON.stringify(APP_STORE_URL)};
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
        // Attempt to open the app. If it fails, page stays visible and we redirect to the store.
        window.location.href = target;
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) opened = true;
      });
      window.addEventListener("pagehide", function () { opened = true; });
      window.addEventListener("blur", function () { opened = true; });

      // Auto-try open (skip for desktop bots / link unfurlers that lack mobile UA).
      if (isAndroid || isIOS) {
        setTimeout(tryOpenApp, 250);
        // If still on this page, app likely missing → Play / App Store.
        setTimeout(goStore, 1800);
      } else if (hint) {
        hint.textContent = "Open this link on your phone to join in the STRON app.";
      }
    })();
  </script>
</body>
</html>`;
};
