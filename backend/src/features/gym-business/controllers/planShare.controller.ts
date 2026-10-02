import MembershipPlan from "../models/membershipPlan.model.js";
import Business from "../models/business.model.js";
import type { Request, Response } from "express";

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
 * Public smart-link for shared gym membership plans.
 * Tries to open the STRON app; if not installed, falls back to the store.
 * Served at both /plan/:id and /api/plan/:id.
 */
export const openSharedPlanPage = async (req: Request, res: Response) => {
  const planId = String(req.params.id || "").trim();

  if (!planId) {
    return res.status(404).type("html").send(
      renderPlanPage({
        title: "Plan not found",
        subtitle: "This plan doesn't exist.",
        planId: "",
      }),
    );
  }

  const ua = req.headers["user-agent"] || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  const playStoreWithRef = `${PLAY_STORE_URL}&referrer=${encodeURIComponent(`utm_source=plan_share&utm_content=${planId}`)}`;
  const androidIntent = `intent://plan/${encodeURIComponent(planId)}#Intent;scheme=stron;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(playStoreWithRef)};end`;

  if (isIOS) {
    return res.redirect(302, APP_STORE_URL);
  }

  if (isAndroid) {
    return res.redirect(302, androidIntent);
  }

  // Desktop / crawler — render OG page.
  let title = "STRON Membership Plan";
  let subtitle = "Open in the STRON app to view and purchase this plan.";

  try {
    const plan = await MembershipPlan.findById(planId)
      .select("name price currency duration durationUnit businessId status isDeleted")
      .lean();

    if (plan && !plan.isDeleted) {
      const planName = String(plan.name || "Membership Plan");
      const price = plan.price != null ? `₹${Number(plan.price).toLocaleString("en-IN")}` : "";
      const dur = plan.duration ?? "";
      const durUnit = String(plan.durationUnit || "MONTHS").toLowerCase().replace(/s$/, "");
      const durationText = dur ? `${dur} ${durUnit}${Number(dur) > 1 ? "s" : ""}` : "";

      title = planName;

      // Try to fetch gym name for richer OG info.
      let gymName = "";
      if (plan.businessId) {
        try {
          const biz = await Business.findById(plan.businessId).select("businessName").lean();
          if (biz?.businessName) gymName = String(biz.businessName);
        } catch {
          // Non-critical — continue without gym name.
        }
      }

      const parts = [price, durationText, gymName].filter(Boolean);
      subtitle = parts.length > 0
        ? `${parts.join(" · ")} — Open in STRON to view and join.`
        : "Open in the STRON app to view and purchase this plan.";
    } else if (plan?.isDeleted) {
      subtitle = "This plan is no longer available.";
    }
  } catch {
    // Still render page even if DB lookup fails.
  }

  return res.status(200).type("html").send(
    renderPlanPage({
      title,
      subtitle,
      planId,
    }),
  );
};

const renderPlanPage = ({
  title,
  subtitle,
  planId,
}: {
  title: string;
  subtitle: string;
  planId: string;
}) => {
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const apiBase = String(process.env.PUBLIC_API_BASE_URL || "https://api.stron.in").replace(
    /\/$/,
    "",
  );
  const canonicalUrl = planId
    ? `${apiBase}/api/plan/${encodeURIComponent(planId)}`
    : apiBase;
  const customScheme = planId
    ? `stron://plan/${encodeURIComponent(planId)}`
    : "stron://home";
  const playStoreWithRef = planId
    ? `${PLAY_STORE_URL}&referrer=${encodeURIComponent(`utm_source=plan_share&utm_content=${planId}`)}`
    : PLAY_STORE_URL;
  const androidIntent = planId
    ? `intent://plan/${encodeURIComponent(planId)}#Intent;scheme=stron;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(playStoreWithRef)};end`
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
  <meta name="apple-itunes-app" content="app-id=${IOS_APP_STORE_ID}${planId ? `, app-argument=${escapeHtml(customScheme)}` : ""}" />
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
        window.location.href = target;
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) opened = true;
      });
      window.addEventListener("pagehide", function () { opened = true; });
      window.addEventListener("blur", function () { opened = true; });

      if (isAndroid || isIOS) {
        setTimeout(tryOpenApp, 250);
        setTimeout(goStore, 1800);
      } else if (hint) {
        hint.textContent = "Open this link on your phone to view this plan in the STRON app.";
      }
    })();
  </script>
</body>
</html>`;
};
