import { getApp } from "@react-native-firebase/app";
import { getAuth as getAuthInstance } from "@react-native-firebase/auth";
import { getDatabase as getDatabaseInstance } from "@react-native-firebase/database";
import { getAnalytics as getAnalyticsInstance } from "@react-native-firebase/analytics";
import { getRemoteConfig as getRemoteConfigInstance } from "@react-native-firebase/remote-config";

/** Shared Firebase app instance — use modular getters below instead of namespaced `auth()` / `database()`. */
export const firebaseApp = getApp();

export const getFirebaseAuth = () => {
  return getAuthInstance(firebaseApp);
};

export const getFirebaseDatabase = () => {
  return getDatabaseInstance(firebaseApp);
};

export const getFirebaseAnalytics = () => {
  return getAnalyticsInstance(firebaseApp);
};

export const getFirebaseRemoteConfig = () => {
  return getRemoteConfigInstance(firebaseApp);
};
