import { StepRaceService } from "@/services/stepRace/stepRace.service";
import * as StepRaceSync from "@/services/stepRace/stepRaceSync.service";
import * as StepRaceLive from "@/services/stepRace/stepRace.live";
import * as StepRaceLiveNotification from "@/services/stepRace/stepRaceLiveNotification.service";
import * as StepRaceOpponentImages from "@/services/stepRace/stepRaceOpponentImages";
import * as ShareCardGenerator from "@/services/stepRace/shareCardGenerator.service";

export const StepRaceApi = {
  ...StepRaceService,
  sync: StepRaceSync,
  live: StepRaceLive,
  liveNotification: StepRaceLiveNotification,
  opponentImages: StepRaceOpponentImages,
  shareCard: ShareCardGenerator,
};

export { StepRaceService } from "@/services/stepRace/stepRace.service";
export {
  resolveStepRaceOpponentAvatarSource,
  resolveStepRaceOpponentAvatarUrl,
  STEP_RACE_OPPONENT_AVATAR_URLS,
  WIKIMEDIA_IMAGE_HEADERS,
} from "@/services/stepRace/stepRaceOpponentImages";
export {
  syncStepRaceLiveNotification,
  clearStepRaceLiveNotification,
} from "@/services/stepRace/stepRaceLiveNotification.service";
export {
  syncActiveRaceIfNeeded,
  syncActiveRaceForUser,
  markRaceCompleted,
  isRaceSyncEnded,
  resolveImmutableStartSteps,
  getRaceTargetSteps,
} from "@/services/stepRace/stepRaceSync.service";
export { generateAndShareResultPdfCard } from "@/services/stepRace/shareCardGenerator.service";
export { computeLiveStepRaceStatus } from "@/services/stepRace/stepRace.live";
export type { LiveStepRaceStatus } from "@/services/stepRace/stepRace.live";
export default StepRaceApi;
