import * as Clarity from "@microsoft/react-native-clarity";
import { Linking } from "react-native";
import { getExpoNotifications } from "../../provider/expoNotificationsLazy";

let clarityInitialized = false;
let lastAttachedUserId: string | null = null;

export type EntrySourcePostHog = "push" | "deep_link" | "organic";
let currentEntrySource: EntrySourcePostHog | null = null;

export const getEntrySourceForPostHog = (): EntrySourcePostHog => {
  return currentEntrySource ?? "organic";
};

// Initialize Clarity ONCE at app root; screen tracking only (no custom tags)
export const initializeClarity = (): void => {
  if (clarityInitialized) return;

  const projectId = process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID?.trim();
  if (!projectId) {
    console.log("ℹ️ [Clarity] Skipping init - EXPO_PUBLIC_CLARITY_PROJECT_ID is empty in env");
    return;
  }

  console.log(`✅ [Clarity] Initialized successfully with Project ID: ${projectId}`);
  Clarity.initialize(projectId, {
    logLevel: __DEV__ ? Clarity.LogLevel.Verbose : Clarity.LogLevel.None,
  });
  clarityInitialized = true;

  attachNavigationSource();
};

// Set current screen name for Clarity session replay (only Clarity tracking used)
export const setClarityScreenName = (screenName: string): void => {
  if (!screenName || !clarityInitialized) return;
  Clarity.setCurrentScreenName(screenName);
};

export const setClarityUserIdentity = (userId: string): void => {
  if (!userId || lastAttachedUserId === userId || !clarityInitialized) return;
  lastAttachedUserId = userId;
  Clarity.setCustomUserId(userId);
};

export const clearClarityUserIdentity = (): void => {
  lastAttachedUserId = null;
};

const attachNavigationSource = async (): Promise<void> => {
  try {
    const Notifications = getExpoNotifications();
    if (Notifications) {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last?.notification) {
        currentEntrySource = "push";
        return;
      }
    }
    const url = await Linking.getInitialURL();
    if (url && url.startsWith("stron://")) {
      currentEntrySource = "deep_link";
      return;
    }
    currentEntrySource = "organic";
  } catch {
    currentEntrySource = "organic";
  }
};
