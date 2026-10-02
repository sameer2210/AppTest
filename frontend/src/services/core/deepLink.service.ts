import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { href } from "@/navigation/href";
import { log, logError } from "@/config/devLogger";
import { captureEvent } from "@/analytics/posthog/events";

const PENDING_INVITE_KEY = "stron_pending_deep_link";

/** Reserved for STRON deep links (events, shares, organizer invites). */
export type PendingDeepLink =
  | { type: "stron_event"; eventKey: string }
  | { type: "stron_opinion" }
  | { type: "stron_plan"; planId: string }
  | { type: "stron_listing"; businessId: string }
  | { type: "stron_user"; uid: string };

export const DeepLinkService = {
  async savePendingInvite(link: PendingDeepLink) {
    await AsyncStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(link));
  },

  async getPendingInvite(): Promise<PendingDeepLink | null> {
    const raw = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PendingDeepLink;
    } catch {
      return null;
    }
  },

  async clearPendingInvite() {
    await AsyncStorage.removeItem(PENDING_INVITE_KEY);
  },

  parseUrl(url: string): PendingDeepLink | null {
    try {
      let path = url.replace(/^stron:\/\//, "").replace(/^https?:\/\/[^/]+/, "");
      path = path.replace(/^\/api/, "");
      if (!path.startsWith("/")) path = `/${path}`;

      // stron://event/<key> or https://host/event/<key>
      if (path.startsWith("/event/")) {
        const raw = path.replace("/event/", "").split(/[/?#]/)[0]?.trim() || "";
        const eventKey = decodeURIComponent(raw);
        if (eventKey) return { type: "stron_event", eventKey };
      }

      // stron://opinion or https://host/opinion/share (or /api/opinion/share)
      if (path === "/opinion" || path.startsWith("/opinion/") || path === "/opinion/share") {
        return { type: "stron_opinion" };
      }

      if (path.startsWith("/plan/")) {
        const raw = path.replace("/plan/", "").split(/[/?#]/)[0]?.trim() || "";
        const planId = decodeURIComponent(raw);
        if (planId) return { type: "stron_plan", planId };
      }

      if (path.startsWith("/listing/") || path.startsWith("/business/")) {
        const raw = path.replace(/^\/(?:listing|business)\//, "").split(/[/?#]/)[0]?.trim() || "";
        const businessId = decodeURIComponent(raw);
        if (businessId) return { type: "stron_listing", businessId };
      }

      if (path.startsWith("/connect/") || path.startsWith("/user/")) {
        const raw = path.replace(/^\/(?:connect|user)\//, "").split(/[/?#]/)[0]?.trim() || "";
        const uid = decodeURIComponent(raw);
        if (uid) return { type: "stron_user", uid };
      }
    } catch (error) {
      logError("Deep link parse failed", error);
    }
    return null;
  },

  async handleDeepLink(url: string, uid?: string | null) {
    const pending = this.parseUrl(url);
    if (!pending) return;

    captureEvent("deep_link_opened", {
      url,
      route:
        pending.type === "stron_event"
          ? `event/${pending.eventKey}`
          : pending.type === "stron_plan"
            ? `plan/${pending.planId}`
            : pending.type === "stron_listing"
              ? `listing/${pending.businessId}`
              : pending.type === "stron_user"
                ? `connect/${pending.uid}`
                : "opinion",
    });

    if (!uid) {
      await this.savePendingInvite(pending);
      router.replace(href.auth.login);
      return;
    }

    await this.processInvite(pending, uid);
  },

  async processPendingInvite(uid: string) {
    const pending = await this.getPendingInvite();
    if (!pending) return;
    await this.clearPendingInvite();
    await this.processInvite(pending, uid);
  },

  async processInvite(pending: PendingDeepLink, _uid: string) {
    try {
      if (pending.type === "stron_event") {
        router.push({
          pathname: href.app.stronEvent,
          params: { key: pending.eventKey },
        });
        return;
      }
      if (pending.type === "stron_opinion") {
        router.push(href.app.home as never);
        return;
      }
      if (pending.type === "stron_plan") {
        router.push({
          pathname: href.app.planPreview as never,
          params: { planId: pending.planId },
        });
        return;
      }
      if (pending.type === "stron_listing") {
        router.push({
          pathname: href.app.plans as never,
          params: { businessId: pending.businessId },
        });
        return;
      }
      if (pending.type === "stron_user") {
        router.push({
          pathname: href.app.connectWithStron as never,
          params: { targetUid: pending.uid },
        });
        return;
      }
    } catch (error) {
      logError("Deep link handling failed", error);
    }
  },

  initListener(getUid: () => string | null | undefined) {
    const onUrl = ({ url }: { url: string }) => {
      log("Deep link received", url);
      void this.handleDeepLink(url, getUid());
    };

    const sub = Linking.addEventListener("url", onUrl);
    void Linking.getInitialURL().then((url) => {
      if (url) void this.handleDeepLink(url, getUid());
    });

    return () => sub.remove();
  },
};
