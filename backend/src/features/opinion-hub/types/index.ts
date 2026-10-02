import type { Types, WithMongoId } from "../../../types/mongoose.util.js";
import type { StronOpinion } from "../models/stronOpinion.model.js";
import type { StronOpinionVote } from "../models/stronOpinionVote.model.js";
import type { StronOpinionLike } from "../models/stronOpinionLike.model.js";

// Canonical Domain Entity Types (Single Source of Truth, derived from Schema)
export type IStronOpinion = WithMongoId<StronOpinion>;
export type IOpinion = IStronOpinion; // Canonical domain alias
export type IStronOpinionVote = WithMongoId<StronOpinionVote>;
export type IStronOpinionLike = WithMongoId<StronOpinionLike>;

// Re-export Schema Types directly for model consumers
export type { StronOpinion, StronOpinionVote, StronOpinionLike };

export interface IOpinionOption {
  optionId: string;
  text: string;
}

export type OpinionOption = IOpinionOption;

export interface OpinionOptionWithStats extends IOpinionOption {
  voteWeight: number;
  percentage: number;
}

export interface OpinionDetailResponse {
  _id: string;
  questionNumber: number;
  questionText: string;
  options: OpinionOptionWithStats[];
  category?: string;
  totalVotes: number;
  totalLikes: number;
  userVotedOptionId?: string | null;
  userLiked?: boolean;
}

export type OpinionSeed = {
  questionText: string;
  options: readonly string[] | string[] | readonly IOpinionOption[] | IOpinionOption[];
  category?: string;
};

export type OpinionResultRow = OpinionOptionWithStats;

