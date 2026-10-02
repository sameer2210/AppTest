import type {
  BaseEntity,
  RaceScopedParams,
  UserIdentifiedParams,
} from "../../../types/domain.base.js";

export type StepRaceStatus =
  | "WAITING"
  | "MATCHED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export interface IStepRaceParticipant {
  uid: string;
  username?: string | null;
  profileImageUrl?: string | null;
  stepCount: number;
  pace?: number;
  finishedAt?: Date | null;
  isWinner?: boolean;
}

export interface IStepRace extends BaseEntity {
  raceId: string;
  targetSteps: number;
  durationMinutes: number;
  stakePoints?: number;
  status: StepRaceStatus;
  participants: IStepRaceParticipant[];
  winnerUid?: string | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
}

export interface CreateRaceParams {
  uid: string;
  targetSteps?: number;
  durationMinutes?: number;
  stakePoints?: number;
}

export interface JoinRaceParams {
  uid: string;
  raceId: string;
}

export interface SyncRaceProgressParams extends JoinRaceParams {
  stepCount: number;
}

export type GetStepRaceStatsParams = UserIdentifiedParams;

export interface SearchOpponentsParams {
  q: string;
  requesterUid?: string;
}

export interface CreateStepRaceServiceParams {
  userId: string;
  opponentUid: string;
  opponentType: string;
  duration?: number;
  startSteps?: number;
}

export type GetActiveRaceParams = UserIdentifiedParams;

export interface UpdateRaceProgressServiceParams extends RaceScopedParams {
  userSteps: number;
  userTimeSeconds?: number;
}

export interface CompleteRaceServiceParams extends RaceScopedParams {
  userSteps?: number;
  userTimeSeconds?: number;
}

export interface GetLeaderboardParams {
  limit?: number;
}

export interface GetRivalryHistoryParams {
  userId?: string;
  opponentUid: string;
  requesterUid?: string;
}

export interface GetStepRaceHistoryParams extends UserIdentifiedParams {
  limit?: number;
}
