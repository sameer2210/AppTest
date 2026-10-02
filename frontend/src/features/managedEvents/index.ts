/** Public API — external consumers import only from here. */

/* ── Model (thunks + selectors) ─────────────────────────────────────────── */
export {
  fetchManagedEventsCatalog,
  fetchMyActivity,
  fetchRewardPreviews,
  fetchEvent,
  fetchEventDashboard,
  createMarathonEvent,
  createStepChallengeEvent,
  createKingOfTheHillEvent,
  createFaceOffEvent,
  publishManagedEvent,
  cancelManagedEvent,
  deleteManagedEvent,
  updateManagedEvent,
  fetchMyOrganizer,
  upsertOrganizer,
  fetchMyOrganizerEvents,
  fetchMyParticipation,
  fetchMyParticipantInfoPrefill,
  fetchProgress,
  fetchLeaderboard,
  fetchMatches,
  validateRegistrationCouponThunk,
  fetchSettlement,
  initSettlement,
  releaseSettlement,
  fetchMyRewards,
  fetchRewardPreviewsList,
  syncManagedEventsLiveNotificationThunk,
  clearManagedEventsLiveNotificationThunk,
} from "./model/managedEvents.thunks";
export {
  default as managedEventsReducer,
  setCatalog as setManagedEventsCatalog,
  setMyActivity as setManagedEventsMyActivity,
  setRewardPreviews as setManagedEventsRewardPreviews,
  selectManagedEventsCatalog,
  selectManagedEventsActivity,
  selectManagedEventsRewards,
  selectManagedEventsLoading,
} from "./model/managedEvents.slice";

/* ── API (types only + live notification helpers) ───────────────────────── */
export {
  syncManagedEventsLiveNotification,
  clearManagedEventsLiveNotification,
} from "./api/managedEvents.api";
export { invalidateCatalogCache } from "@/services/stron/stronManaged.service";
export type {
  ManagedActivityItem,
  StronApiError,
  StronEvent,
  StronEventDashboard,
  StronKotHMatch,
  StronLeaderboardEntry,
  StronParticipation,
  StronProgress,
  StronReward,
  StronSettlement,
} from "./api/managedEvents.api";

/* ── UI utilities ───────────────────────────────────────────────────────── */
export {
  formatEventProgressData,
  formatCompactEventDateRange,
} from "./ui/shared/formatters";
export { buildFormatGameRules } from "./ui/shared/formatGameRules";
export {
  OrganizeCreateScreen,
  ParticipantEventScreen,
  OrganizerPreviewScreen,
  ParticipantDetailScreen,
  EventDashboardScreen,
  EventSettlementScreen,
  OrganizeLeaderboardScreen,
  ExternalListingScreen,
  CreateDuelFormatScreen,
  CreateMarathonScreen,
  CreateStepChallengeScreen,
  EventPublishedScreen,
  ReviewPaymentScreen,
  PaymentSuccessScreen,
  PaymentFailedScreen,
  ActivityScreen,
} from "./ui/screens";
