import { apiClient } from "../core/apiClient.service";
import { logError } from "@/config/devLogger";

export type OpinionOption = {
  optionId: string;
  text: string;
  voteWeight: number;
  percentage: number;
};

export type OpinionPollData = {
  cycleId: number;
  slot?: number;
  questionId: string;
  questionNumber: string;
  questionText: string;
  options: OpinionOption[];
  totalVotesWeight: number;
  /** Distinct voters this cycle — shown as "X Votes" in the UI. */
  totalVoterCount?: number;
  totalVotesFormatted: string;
  timeRemainingMs: number;
  userVotedOptionId: string | null;
  userVoteWeight: number;
  userStreak: number;
  likesCount?: number;
  isLiked?: boolean;
};

export type OpinionFetchResult = {
  opinions: OpinionPollData[];
  timeRemainingMs: number;
  cycleId: number;
};

const formatVoteCount = (votes: number): string => {
  if (votes >= 1_000_000) {
    return `${(votes / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (votes >= 1_000) {
    return `${(votes / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(Math.max(0, Math.floor(votes)));
};

/** Header label — displays total step votes ("1 step = 1 vote"). */
export const formatOpinionVoteLabel = (poll: OpinionPollData): string => {
  const optionWeightSum = (poll.options || []).reduce(
    (sum, opt) => sum + Math.max(0, Number(opt.voteWeight) || 0),
    0,
  );
  let total = Math.max(Number(poll.totalVotesWeight) || 0, optionWeightSum);
  if (poll.userVotedOptionId) {
    total = Math.max(total, Number(poll.userVoteWeight) || 0, 1);
  }
  return `${formatVoteCount(total)} Votes`;
};

const mapOpinionQuestion = (q: any, data: any): OpinionPollData => {
  const options = (Array.isArray(q.options) ? q.options : []).map((opt: any) => ({
    optionId: String(opt.optionId || ""),
    text: String(opt.text || ""),
    voteWeight: Number(opt.voteWeight) || 0,
    percentage: Number(opt.percentage) || 0,
  }));
  const totalVotesWeight = Math.max(
    Number(q.totalVotesWeight) || 0,
    options.reduce((sum: number, opt: OpinionOption) => sum + Math.max(0, opt.voteWeight), 0),
  );
  return {
    cycleId: Number(q.cycleId) || data.cycleId || 1,
    slot: q.slot,
    questionId: String(q.questionId || ""),
    questionNumber: String(q.questionNumber || "#1"),
    questionText: String(q.questionText || ""),
    options,
    totalVotesWeight,
    totalVoterCount: Number(q.totalVoterCount) || 0,
    // Always format from step weight — never voter headcount
    totalVotesFormatted:
      q.totalVotesFormatted && Number(q.totalVotesWeight) > 0
        ? String(q.totalVotesFormatted)
        : `${formatVoteCount(totalVotesWeight)} Votes`,
    timeRemainingMs: Number(q.timeRemainingMs) || Number(data.timeRemainingMs) || 0,
    userVotedOptionId: q.userVotedOptionId || null,
    userVoteWeight: Number(q.userVoteWeight) || 0,
    userStreak: Number(q.userStreak) || 0,
    likesCount: Number(q.likesCount) || 0,
    isLiked: Boolean(q.isLiked),
  };
};

export const OpinionService = {
  /**
   * Fetch live opinions queue for the current 12-hour cycle.
   * Uses X-Optional-Auth so authenticated users receive their userVotedOptionId,
   * while guests can still view the questions without login.
   */
  async getCurrentOpinions(): Promise<OpinionFetchResult | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await apiClient.get<any>("/api/opinion/current", {
          headers: { "X-Optional-Auth": "true" },
        });
        const data = response.data?.data || response.data;
        if (!data) return null;

        const rawOpinions: any[] =
          Array.isArray(data.opinions) && data.opinions.length > 0
            ? data.opinions
            : data.questionText
              ? [data]
              : [];

        if (rawOpinions.length === 0) return null;

        const opinions: OpinionPollData[] = rawOpinions
          .filter((q) => q && q.questionText && Array.isArray(q.options) && q.options.length > 0)
          .map((q) => mapOpinionQuestion(q, data));

        return {
          opinions,
          timeRemainingMs: Number(data.timeRemainingMs) || opinions[0]?.timeRemainingMs || 0,
          cycleId: Number(data.cycleId) || opinions[0]?.cycleId || 1,
        };
      } catch (err) {
        logError("getCurrentOpinions failed attempt=" + attempt, err);
        if (attempt === 0) {
          await new Promise<void>((resolve) => setTimeout(() => resolve(), 1500));
        }
      }
    }
    return null;
  },

  /**
   * Submit or shift vote on a specific opinion question in the queue.
   * Throws if submission fails so UI can rollback optimistic state.
   */
  async submitVote(optionId: string, questionId?: string): Promise<OpinionFetchResult> {
    try {
      const response = await apiClient.post<any>("/api/opinion/vote", {
        optionId,
        questionId,
      });
      const data = response.data?.data || response.data;
      if (!data) {
        throw new Error("Invalid response from opinion vote server");
      }

      const rawOpinions: any[] =
        Array.isArray(data.opinions) && data.opinions.length > 0
          ? data.opinions
          : data.questionText
            ? [data]
            : [];

      if (rawOpinions.length === 0) {
        throw new Error("No opinions returned from vote response");
      }

      const opinions: OpinionPollData[] = rawOpinions
        .filter((q) => q && q.questionText && Array.isArray(q.options))
        .map((q) => mapOpinionQuestion(q, data));

      return {
        opinions,
        timeRemainingMs: Number(data.timeRemainingMs) || opinions[0]?.timeRemainingMs || 0,
        cycleId: Number(data.cycleId) || opinions[0]?.cycleId || 1,
      };
    } catch (error) {
      logError("submitVote failed", error);
      throw error;
    }
  },

  async toggleLike(
    questionId?: string,
  ): Promise<{ cycleId: number; questionId: string; likesCount: number; isLiked: boolean }> {
    try {
      const response = await apiClient.post<{
        cycleId: number;
        questionId: string;
        likesCount: number;
        isLiked: boolean;
      }>("/api/opinion/like", {
        questionId,
      });
      return response.data;
    } catch (error) {
      logError("toggleLike failed", error);
      throw error;
    }
  },
};
