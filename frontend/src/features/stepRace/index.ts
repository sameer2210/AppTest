/** Public API — external consumers import only from here. */

/* ── Model (thunks + selectors) ─────────────────────────────────────────── */
export {
  fetchActiveStepRace,
  fetchStepRaceStats,
  searchStepRaceOpponents,
  syncActiveRace,
  clearActiveRaceSync,
  syncStepRaceLiveNotificationThunk,
  clearStepRaceLiveNotificationThunk,
  getUserWinsCountThunk,
  incrementUserWinsCountThunk,
  getRandomShadowOpponentsThunk,
  createStepRaceThunk,
  completeStepRaceThunk,
  getMatchHistoryThunk,
  saveMatchHistoryThunk,
  getRivalryHistoryThunk,
  syncActiveRaceIfNeededThunk,
  markRaceCompletedThunk,
  generateAndShareResultPdfCardThunk,
} from "./model/stepRace.thunks";
export {
  default as stepRaceReducer,
  setActiveRace,
  setStepRaceStatus,
  setStepRaceLoading,
  setStepRaceError,
  selectActiveRace,
  selectStepRaceStatus,
  selectStepRaceLoading,
} from "./model/stepRace.slice";

/* ── Utilities ──────────────────────────────────────────────────────────── */
export {
  resolveStepRaceOpponentAvatarSource,
  isRaceSyncEnded,
} from "./api/stepRace.api";

/* ── API (types + live helpers only) ────────────────────────────────────── */
export {
  computeLiveStepRaceStatus,
  syncStepRaceLiveNotification,
  clearStepRaceLiveNotification,
  syncActiveRaceIfNeeded,
  syncActiveRaceForUser,
  markRaceCompleted,
  generateAndShareResultPdfCard,
} from "./api/stepRace.api";
export type { LiveStepRaceStatus } from "./api/stepRace.api";

/* ── Screens ────────────────────────────────────────────────────────────── */
export {
  MyRacesScreen,
  StepRaceScreen,
  OngoingStepRaceScreen,
  CompletedStepRaceScreen,
} from "./ui/screens";
