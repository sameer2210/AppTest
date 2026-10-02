import Constants, { ExecutionEnvironment } from "expo-constants";
import {
  getAnalytics,
  logEvent,
  setAnalyticsCollectionEnabled,
} from "@react-native-firebase/analytics";
import { log } from "@/config/devLogger";

let analyticsRef: ReturnType<typeof getAnalytics> | null | undefined;

const getAnalyticsInstance = (): ReturnType<typeof getAnalytics> | null => {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  if (analyticsRef !== undefined) {
    return analyticsRef;
  }
  try {
    analyticsRef = getAnalytics();
    return analyticsRef;
  } catch {
    analyticsRef = null;
    return null;
  }
};

export const analyticsInstance = () => getAnalyticsInstance();

export const setDataCollection = async (value: boolean) => {
  log("set data collection", value);
  const analytics = getAnalyticsInstance();
  if (!analytics) return;
  await setAnalyticsCollectionEnabled(analytics, value);
};

export const isTrackingEnabled = () => !__DEV__;

export const logFirebaseScreenView = async (routeKey: string): Promise<void> => {
  const analytics = getAnalyticsInstance();
  if (!analytics) return;
  await logEvent(analytics, "screen_view", {
    firebase_screen: routeKey,
    firebase_screen_class: routeKey,
  });
};
