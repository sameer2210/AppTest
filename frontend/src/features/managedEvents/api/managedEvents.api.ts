/**
 * Managed events domain API facade — model/thunks/hooks call this, not legacy services directly.
 */
import {
  StronManagedService,
  type StronApiError,
} from "@/services/stron/stronManaged.service";
import type { StronEventDashboard } from "@/models/stronManaged/dashboard";
import type {
  StronSettlement,
  StronSettlementStatus,
} from "@/models/stronManaged/settlement";
import * as ManagedEventsLiveNotification from "@/services/stron/managedEventsLiveNotification.service";

export { StronApiError };
export type { StronEventDashboard, StronSettlement, StronSettlementStatus };
export type { StronEvent } from "@/models/stronManaged/event";
export type {
  StronKotHMatch,
  StronLeaderboardEntry,
  StronParticipation,
  StronProgress,
} from "@/models/stronManaged/participation";
export type { StronReward } from "@/models/stronManaged/reward";

export {
  syncManagedEventsLiveNotification,
  clearManagedEventsLiveNotification,
} from "@/services/stron/managedEventsLiveNotification.service";
export { StronManagedService };
export const ManagedEventsApi = {
  ...StronManagedService,
  liveNotification: ManagedEventsLiveNotification,
};

export type ManagedActivityItem = Awaited<
  ReturnType<typeof ManagedEventsApi.getMyActivity>
>[number];

export default ManagedEventsApi;
