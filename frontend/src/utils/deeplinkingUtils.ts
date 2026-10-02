import { Linking, AppState } from "react-native";
import { router } from "expo-router";
import { store } from "../store";
import { setDeeplink } from "@/features/system";
import { log, logError } from "../config/devLogger";
import { localNotificationHelper } from "../provider/NotificationProvider";
import { getExpoNotifications } from "../provider/expoNotificationsLazy";
import { href } from "../navigation/href";
import { captureEvent } from "../analytics/posthog/events";

export const parseDeepLinkFromNotification = (data: unknown): string | null => {
  try {
    const d = data as { deepLink?: string; deep_link?: string };
    if (d?.deepLink) {
      return d.deepLink;
    }
    if (d?.deep_link) {
      return d.deep_link;
    }
    return null;
  } catch (error) {
    logError("Error parsing deep link from notification:", error);
    return null;
  }
};

export const handleDeepLink = async (deepLink: string): Promise<void> => {
  try {
    log("Handling deep link:", deepLink);

    if (!deepLink || typeof deepLink !== "string") {
      logError("Invalid deep link:", deepLink);
      return;
    }

    const url = new URL(deepLink.replace("stron://", "http://")) as URL & { pathname: string };
    const path = url.pathname;

    switch (path) {
      case "/events":
      case "/assistant":
      case "/reports":
        store.dispatch(setDeeplink(deepLink));
        router.push(href.app.events);
        break;

      case "/clan":
      case "/clans":
      case "/battles":
      case "/shop":
        store.dispatch(setDeeplink(deepLink));
        router.push(href.app.home);
        break;

      case "/settings":
      case "/profile":
        store.dispatch(setDeeplink(deepLink));
        router.push(href.app.profile);
        break;

      case "/home":
        router.push(href.app.tabs);
        break;

      case "/ongoing-step-race":
      case "/step-race/live":
        store.dispatch(setDeeplink(deepLink));
        router.push(href.app.ongoingStepRace as never);
        break;

      case "/opinion":
      case "/opinion/share":
        router.push(href.app.home as never);
        break;

      default:
        if (path.startsWith("/plan/")) {
          const planId = path.replace("/plan/", "").split(/[/?#]/)[0];
          if (planId) {
            store.dispatch(setDeeplink(deepLink));
            router.push({
              pathname: href.app.planPreview as never,
              params: { planId },
            });
            return;
          }
        }
        if (path.startsWith("/listing/") || path.startsWith("/business/")) {
          const businessId = path.replace(/^\/(?:listing|business)\//, "").split(/[/?#]/)[0];
          if (businessId) {
            store.dispatch(setDeeplink(deepLink));
            router.push({
              pathname: href.app.plans as never,
              params: { businessId },
            });
            return;
          }
        }
        if (path.startsWith("/connect/") || path.startsWith("/user/")) {
          const targetUid = path.replace(/^\/(?:connect|user)\//, "").split(/[/?#]/)[0];
          if (targetUid) {
            store.dispatch(setDeeplink(deepLink));
            router.push({
              pathname: href.app.connectWithStron as never,
              params: { targetUid },
            });
            return;
          }
        }
        log("Unknown deep link path:", path);
        break;
    }
  } catch (error) {
    logError("Error handling deep link:", error);
  }
};

export const buildDeepLinkFromNotificationData = (data: unknown): string | null => {
  log("buildDeepLinkFromNotificationData", data);

  const directDeepLink = parseDeepLinkFromNotification(data);
  if (directDeepLink) {
    return directDeepLink.replace("kai://", "stron://");
  }

  const d = data as { key?: string } | null;
  if (d?.key) {
    const key = d.key.toLowerCase();
    switch (key) {
      case "events":
      case "event":
        return "stron://events";
      case "clan":
      case "clans":
        return "stron://clan";
      case "battles":
      case "battle":
        return "stron://battles";
      case "shop":
        return "stron://shop";
      case "settings":
      case "profile":
        return "stron://settings";
      case "home":
        return "stron://home";
      case "step_race_live":
      case "steprace":
      case "step_race":
        return "stron://ongoing-step-race";
      case "events_live":
        return "stron://home";
      default:
        log("Unknown notification key:", key);
        break;
    }
  }

  return null;
};

const openUrlFromNotificationOrLink = (url: string): void => {
  const normalizedUrl = url.replace("kai://", "stron://");
  // HTTPS /event/* links are handled by DeepLinkService (StronBootstrap).
  if (normalizedUrl.startsWith("stron://")) {
    void handleDeepLink(normalizedUrl);
  }
};

export const initDeepLinkListeners = (): (() => void) => {
  const Notifications = getExpoNotifications();

  const onReceiveURL = ({ url }: { url: string }) => {
    log("onReceiveURL", url);
    openUrlFromNotificationOrLink(url);
  };

  const linkingSubscription = Linking.addEventListener("url", onReceiveURL);

  const notificationSubscription = Notifications
    ? Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          Record<string, string> | undefined;
        captureEvent("notification_opened", {
          route: data ? (buildDeepLinkFromNotificationData(data) ?? undefined) : undefined,
        });
        if (AppState.currentState === "active") {
          localNotificationHelper("press", {
            notification: {
              id: response.notification.request.identifier,
              data: (data ?? {}) as Record<string, unknown>,
            },
          });
          return;
        }
        if (data) {
          const url = buildDeepLinkFromNotificationData(data);
          if (typeof url === "string") {
            openUrlFromNotificationOrLink(url);
          }
        }
      })
    : { remove: () => {} };

  void (async () => {
    try {
      const url = await Linking.getInitialURL();
      if (typeof url === "string") {
        openUrlFromNotificationOrLink(url);
        return;
      }
      const response = Notifications
        ? await Notifications.getLastNotificationResponseAsync()
        : null;
      const data = response?.notification?.request?.content?.data as
        Record<string, string> | undefined;
      log("message notification", response?.notification);
      if (!store.getState().auth?.isAuthenticated) {
        return;
      }
      const deeplinkURL = buildDeepLinkFromNotificationData(data);
      if (typeof deeplinkURL === "string") {
        openUrlFromNotificationOrLink(deeplinkURL);
      }
    } catch (e) {
      log("initDeepLinkListeners cold start", e);
    }
  })();

  return () => {
    try {
      linkingSubscription.remove();
      notificationSubscription.remove();
    } catch (error) {
      log("Error in deeplinking cleanup:", error);
    }
  };
};
