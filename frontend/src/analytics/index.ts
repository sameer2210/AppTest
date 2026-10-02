export { analyticsInstance, isTrackingEnabled, setDataCollection } from "./firebase/client";
export { trackingInitialization, trackingLogin } from "./firebase/userSession";

export {
  initializeClarity,
  setClarityScreenName,
  setClarityUserIdentity,
  clearClarityUserIdentity,
  getEntrySourceForPostHog,
} from "./clarity";
export type { EntrySourcePostHog } from "./clarity";

export {
  posthog,
  registerSuperProperties,
  identifyUser,
  resetAnalyticsUser,
  isPostHogEnabled,
  getPostHogApiKey,
} from "./posthog/client";
export type { IdentifyTraits } from "./posthog/client";

export { captureEvent } from "./posthog/events";
export type { AnalyticsEventName, AnalyticsEventMap } from "./posthog/events";
