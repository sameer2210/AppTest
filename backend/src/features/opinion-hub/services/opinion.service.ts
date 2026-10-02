import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import StronOpinionModel from "../models/stronOpinion.model.js";
import StronOpinionVoteModel from "../models/stronOpinionVote.model.js";
import StronOpinionLikeModel from "../models/stronOpinionLike.model.js";
import { UserModel } from "../../identity-auth/index.js";
import { logger } from "../../../utils/logger.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { getErrorMessage, getMongoErrorCode } from "../../../types/mongo.util.js";
import type { MongoFilter, ServiceParams } from "../../../types/service.util.js";

import type {
  OpinionOption,
  OpinionSeed,
  OpinionResultRow,
  IStronOpinion,
  IOpinion,
  IStronOpinionVote,
  IStronOpinionLike,
} from "../types/index.js";
import {
  TWELVE_HOURS_MS,
  QUESTION_NUMBER_BASE_OFFSET,
  GNEWS_API_KEY,
  GEMINI_API_KEY,
  GEMINI_MODELS,
  SIMPLE_FALLBACK_POOL,
  NOTIFY_CHUNK,
} from "../../../constants/index.js";


/** Strip emoji pictographs only — avoid broad ranges that erase real option text. */
export const stripEmojis = (text: unknown): string => {
  if (!text) return "";
  return String(text)
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .trim();
};

const optionText = (opt: unknown, index: number): string => {
  if (typeof opt === "string") return stripEmojis(opt);
  if (opt && typeof opt === "object" && "text" in opt) {
    return stripEmojis((opt as { text?: unknown }).text) || `Option ${index + 1}`;
  }
  return `Option ${index + 1}`;
};

/** Coerce DB/AI options into exactly 2 { optionId, text } rows. */
export const normalizeOpinionOptions = (rawOptions: unknown[] = []): OpinionOption[] => {
  const cleaned = (Array.isArray(rawOptions) ? rawOptions : [])
    .map((opt, i) => {
      const optionId =
        opt && typeof opt === "object" && "optionId" in opt && (opt as OpinionOption).optionId
          ? String((opt as OpinionOption).optionId)
          : `opt_${i + 1}`;
      return {
        optionId,
        text: optionText(opt, i),
      };
    })
    .filter((opt) => opt.text);

  const seen = new Set<string>();
  const unique: OpinionOption[] = [];
  for (const opt of cleaned) {
    const key = opt.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({
      optionId: opt.optionId || `opt_${unique.length + 1}`,
      text: opt.text,
    });
  }

  if (unique.length === 0) {
    unique.push({ optionId: "opt_1", text: "Yes" });
    unique.push({ optionId: "opt_2", text: "No" });
  } else if (unique.length === 1) {
    const second = unique[0].text.toLowerCase() === "yes" ? "No" : "Option 2";
    unique.push({ optionId: "opt_2", text: second });
  }

  return unique.slice(0, 2);
};

const pickUnusedFallbacks = (
  recentTexts: unknown[] | null | undefined,
  cycleId: number,
  count = 3,
): OpinionSeed[] => {
  const recent = new Set(
    (recentTexts || []).map((t) => String(t || "").trim().toLowerCase()),
  );
  const unused = SIMPLE_FALLBACK_POOL.filter(
    (item) => !recent.has(item.questionText.trim().toLowerCase()),
  );
  const pool = unused.length >= count ? unused : SIMPLE_FALLBACK_POOL;

  const result: OpinionSeed[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (Math.abs(cycleId) * count + i) % pool.length;
    result.push(pool[idx]);
  }
  return result;
};

const recentQuestionTexts = async (
  excludeCycleId: number | null | undefined,
): Promise<string[]> => {
  const query: MongoFilter =
    excludeCycleId != null ? { cycleId: { $ne: excludeCycleId } } : {};
  const rows = await StronOpinionModel.find(query)
    .sort({ createdAt: -1 })
    .limit(40)
    .select("questionText")
    .lean();
  return rows.map((r) => r.questionText).filter(Boolean) as string[];
};

/** Calculates current 12-hour cycle parameters. */
export const getCurrentCycleInfo = () => {
  const now = Date.now();
  const cycleId = Math.floor(now / TWELVE_HOURS_MS);
  const cycleStartTime = new Date(cycleId * TWELVE_HOURS_MS);
  const cycleEndTime = new Date((cycleId + 1) * TWELVE_HOURS_MS);
  const timeRemainingMs = Math.max(0, cycleEndTime.getTime() - now);
  const questionNumber = (cycleId - QUESTION_NUMBER_BASE_OFFSET) * 3 + 1;

  return { cycleId, cycleStartTime, cycleEndTime, timeRemainingMs, questionNumber };
};

/**
 * Vote weight = server today's step count.
 * 0 steps → weight 1; 67 steps → weight 67. Client-reported steps are ignored.
 */
export const resolveVoteStepWeight = (todaysStepCount: unknown): number => {
  const steps = Math.max(0, Math.floor(Number(todaysStepCount) || 0));
  return Math.max(1, steps);
};

/**
 * Resolve display streak and persist a broken streak (missed ≥1 full 12h cycle).
 */
export const resolveAndPersistOpinionStreak = async (
  userDoc: ServiceParams | null | undefined,
  cycleId: number,
): Promise<number> => {
  if (!userDoc) return 0;

  const last = Number(userDoc.lastOpinionCycleId) || 0;
  const current = Number(userDoc.opinionStreak) || 0;

  if (last === cycleId) {
    return current;
  }

  if (last > 0 && cycleId - last > 1) {
    if (current !== 0) {
      userDoc.opinionStreak = 0;
      if (typeof userDoc.save === "function") {
        await userDoc.save();
      }
    }
    return 0;
  }

  return current;
};

export const formatVoteCount = (votes: number): string => {
  if (votes >= 1_000_000) {
    return `${(votes / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (votes >= 1_000) {
    return `${(votes / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(votes);
};

/** Call Gemini generateContent, trying known-good model ids. */
const generateGeminiText = async (
  ai: GoogleGenAI,
  prompt: string,
): Promise<{ text: string; model: string | null }> => {
  let lastError: unknown = null;

  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      const text = response?.text || "";
      if (text) return { text, model };
    } catch (err: unknown) {
      lastError = err;
      logger.warn(`⚠️ [GoogleGenAI] Model ${model} failed:`, getErrorMessage(err));
    }
  }

  if (lastError) throw lastError;
  return { text: "", model: null };
};

/** Generate 3 short, simple opinion questions using GoogleGenAI SDK */
export const generateAiOpinionQuestions = async (
  articles: ServiceParams[],
  recentTexts: unknown[] = [],
): Promise<OpinionSeed[] | null> => {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("REPLACE_WITH")) {
    return null;
  }
  if (!articles || articles.length === 0) return null;

  try {
    const headlinesSummary = articles
      .slice(0, 15)
      .map((a: ServiceParams) => `- ${a.title}`)
      .join("\n");

    const avoidList = (recentTexts || [])
      .slice(0, 20)
      .map((t) => `- ${t}`)
      .join("\n");
    const prompt = `You write in-app opinion polls for Stron, a steps and fitness sports app in India.

Headlines:
${headlinesSummary}

${avoidList ? `Do NOT repeat or rephrase any of these recent questions:\n${avoidList}\n` : ""}
Generate exactly 3 short, timely sports, cricket, football, fitness, or running debate questions people can answer in 2 seconds.

Return JSON only:
{
  "questions": [
    {
      "questionText": "Short question under 10 words?",
      "options": ["Option 1", "Option 2"],
      "category": "sports"
    },
    {
      "questionText": "Short question under 10 words?",
      "options": ["Option 1", "Option 2"],
      "category": "health"
    },
    {
      "questionText": "Short question under 10 words?",
      "options": ["Option 1", "Option 2"],
      "category": "sports"
    }
  ]
}

Rules:
1. Exactly 3 questions.
2. Exactly 2 options per question. Never 3 options.
3. No emojis. No hashtags.
4. Topics: Cricket, Football, Running, Fitness, Gym, Nutrition.
5. Never reuse a question from the avoid list.`;

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const { text: outputText, model } = await generateGeminiText(ai, prompt);

    if (!outputText) return null;

    const jsonMatch = outputText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return null;
    }

    const validQuestions: OpinionSeed[] = [];
    for (const q of parsed.questions) {
      if (!q.questionText || !Array.isArray(q.options)) continue;
      const cleanOptions = normalizeOpinionOptions(q.options);
      if (cleanOptions.length !== 2) continue;
      const questionText = stripEmojis(q.questionText);
      if (!questionText) continue;
      validQuestions.push({
        questionText,
        options: cleanOptions,
        category: q.category || "sports",
      });
    }

    if (validQuestions.length >= 3) {
      logger.info(`[GoogleGenAI] 3 Opinions generated via ${model}`);
      return validQuestions.slice(0, 3);
    }
    return null;
  } catch (err: unknown) {
    logger.warn("⚠️ [GoogleGenAI] Error generating opinions:", getErrorMessage(err));
    return null;
  }
};

/** Fetch sports & health headlines from GNews API */
export const fetchGNewsHeadlines = async (): Promise<ServiceParams[]> => {
  if (!GNEWS_API_KEY) {
    return [];
  }

  const urls = [
    `https://gnews.io/api/v4/top-headlines?category=sports&lang=en&max=10&apikey=${GNEWS_API_KEY}`,
    `https://gnews.io/api/v4/search?q=fitness%20OR%20health%20OR%20cricket%20OR%20football&lang=en&max=10&apikey=${GNEWS_API_KEY}`,
  ];

  const articles: ServiceParams[] = [];
  for (const url of urls) {
    try {
      const response = await axios.get(url, { timeout: 8000 });
      const batch = Array.isArray(response.data?.articles) ? response.data.articles : [];
      articles.push(...batch);
      if (articles.length >= 8) break;
    } catch (err: unknown) {
      const ax = err as ServiceParams;
      const status = ax.response?.status;
      const msg = ax.response?.data?.message || getErrorMessage(err);
      logger.error(`⚠️ [GNews API] Fetch error (${status || "network"}):`, msg);
    }
  }

  const unique: ServiceParams[] = [];
  const seen = new Set<string>();
  for (const article of articles) {
    const title = String(article?.title || "").trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    unique.push(article);
  }

  return unique;
};

/** Ensures exactly 3 opinion questions exist for this 12-hour cycle and returns them. */
const ensureCycleQuestions = async (
  cycleId: number,
  cycleStartTime: Date,
  cycleEndTime: Date,
) => {
  let existing = await StronOpinionModel.find({ cycleId }).sort({ slot: 1, createdAt: 1 });

  // Handle legacy single-question documents if slot wasn't set
  if (existing.length === 1 && !existing[0].slot) {
    existing[0].slot = 1;
    existing[0].set("options", normalizeOpinionOptions(existing[0].options as unknown[]));
    await existing[0].save();
  }

  if (existing.length >= 3) {
    return existing.slice(0, 3);
  }

  const isTest = process.env.NODE_ENV === "test";
  const recentTexts = await recentQuestionTexts(cycleId);
  const articles = isTest ? [] : await fetchGNewsHeadlines();
  const aiQuestions = !isTest && articles.length
    ? await generateAiOpinionQuestions(articles, recentTexts)
    : null;

  const fallbackQuestions = pickUnusedFallbacks(recentTexts, cycleId, 3);
  const seedQuestions = aiQuestions && aiQuestions.length >= 3 ? aiQuestions : fallbackQuestions;
  const dbCount = await StronOpinionModel.countDocuments();

  const createdQuestions = [...existing];
  for (let slot = existing.length + 1; slot <= 3; slot++) {
    const seed = seedQuestions[slot - 1] || fallbackQuestions[slot - 1] || SIMPLE_FALLBACK_POOL[0];
    const qId = `cycle_${cycleId}_${slot}`;

    try {
      const newDoc = await StronOpinionModel.create({
        questionId: qId,
        cycleId,
        slot,
        cycleStartTime,
        cycleEndTime,
        questionNumber: dbCount + slot,
        questionText: seed.questionText,
        options: normalizeOpinionOptions(seed.options as unknown[]),
        category: seed.category || "sports",
        isActive: true,
        aiUpgradeAttempted: true,
      });
      createdQuestions.push(newDoc);
    } catch (err: unknown) {
      if (getMongoErrorCode(err) === 11000) {
        const found = await StronOpinionModel.findOne({ questionId: qId });
        if (found) createdQuestions.push(found);
      } else {
        logger.error("Error seeding opinion question:", err);
      }
    }
  }

  return createdQuestions.sort((a, b) => (a.slot || 1) - (b.slot || 1));
};

/** Retrieves all 3 opinion poll details for the current 12-hour cycle. */
export const getOpinionPollDetails = async (uid: string | null | undefined) => {
  const { cycleId, cycleStartTime, cycleEndTime, timeRemainingMs, questionNumber } =
    getCurrentCycleInfo();

  const cycleQuestions = await ensureCycleQuestions(cycleId, cycleStartTime, cycleEndTime);

  // Fetch all user votes and likes for this cycle
  let userVotesMap = new Map();
  let userLikesSet = new Set();
  let userStreak = 0;

  if (uid) {
    const [userVotes, userLikes, userDoc] = await Promise.all([
      StronOpinionVoteModel.find({ cycleId, uid }).lean(),
      StronOpinionLikeModel.find({ cycleId, uid }).lean(),
      UserModel.findOne({ uid }),
    ]);

    // Self-heal: keep stored stepWeight aligned with live todaysStepCount (1 step = 1 vote)
    let votesForMap = userVotes;
    if (userDoc && userVotes.length > 0) {
      const liveWeight = resolveVoteStepWeight(userDoc.todaysStepCount);
      const needsRefresh = userVotes.some(
        (v) => resolveVoteStepWeight(v.stepWeight) !== liveWeight,
      );
      if (needsRefresh) {
        await StronOpinionVoteModel.updateMany(
          { cycleId, uid },
          { $set: { stepWeight: liveWeight } },
        );
        votesForMap = await StronOpinionVoteModel.find({ cycleId, uid }).lean();
      }
    }

    for (const v of votesForMap) {
      userVotesMap.set(String(v.questionId), v);
    }
    for (const l of userLikes) {
      userLikesSet.add(String(l.questionId));
    }
    if (userDoc) {
      userStreak = await resolveAndPersistOpinionStreak(userDoc, cycleId);
    }
  }

  // Batch aggregate votes & likes for all 3 questions in one shot
  const questionIds = cycleQuestions.map((q) => q.questionId);
  const [voteAgg, likeAgg] = await Promise.all([
    StronOpinionVoteModel.aggregate([
      {
        $match: {
          cycleId,
          questionId: { $in: questionIds },
        },
      },
      {
        $group: {
          _id: { questionId: "$questionId", optionId: "$optionId" },
          totalWeight: { $sum: "$stepWeight" },
          voterCount: { $sum: 1 },
        },
      },
    ]),
    StronOpinionLikeModel.aggregate([
      {
        $match: {
          questionId: { $in: questionIds },
        },
      },
      {
        $group: {
          _id: "$questionId",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const voteStatsMap = new Map();
  for (const item of voteAgg) {
    const qId = String(item._id.questionId);
    const optId = String(item._id.optionId);
    if (!voteStatsMap.has(qId)) {
      voteStatsMap.set(qId, { totalWeight: 0, totalVoters: 0, options: {} });
    }
    const qStats = voteStatsMap.get(qId);
    qStats.totalWeight += item.totalWeight;
    qStats.totalVoters += item.voterCount;
    qStats.options[optId] = item.totalWeight;
  }

  const likeStatsMap = new Map();
  for (const item of likeAgg) {
    likeStatsMap.set(String(item._id), item.count);
  }

  // Build response for each question
  const opinions = [];
  for (let i = 0; i < cycleQuestions.length; i++) {
    const q = cycleQuestions[i];
    const displayOptions = normalizeOpinionOptions(q.options as unknown[]);
    const qStats = voteStatsMap.get(String(q.questionId)) || { totalWeight: 0, totalVoters: 0, options: {} };
    const totalVotesWeight = qStats.totalWeight;
    const totalVoterCount = qStats.totalVoters;

    const optionsWithStats = displayOptions.map((opt) => {
      const weight = qStats.options[String(opt.optionId)] || 0;
      const percentage =
        totalVotesWeight > 0
          ? Math.round((weight / totalVotesWeight) * 100)
          : 50;
      return {
        optionId: opt.optionId,
        text: opt.text,
        voteWeight: weight,
        percentage,
      };
    });

    if (optionsWithStats.length === 2 && totalVotesWeight > 0) {
      const firstPct = optionsWithStats[0].percentage;
      optionsWithStats[1].percentage = Math.max(0, 100 - firstPct);
    }

    const likesCount = likeStatsMap.get(String(q.questionId)) || 0;
    const userVote = userVotesMap.get(String(q.questionId));
    const isLiked = userLikesSet.has(String(q.questionId));
    const displayQuestionNum = q.questionNumber || questionNumber + i;

    opinions.push({
      cycleId,
      slot: q.slot || i + 1,
      questionId: q.questionId,
      questionNumber: `#${displayQuestionNum}`,
      questionText: q.questionText,
      options: optionsWithStats,
      totalVotesWeight,
      totalVoterCount,
      totalVotesFormatted: `${formatVoteCount(totalVotesWeight)} Votes`,
      timeRemainingMs,
      userVotedOptionId: userVote ? userVote.optionId : null,
      userVoteWeight: userVote ? userVote.stepWeight : 0,
      userStreak,
      likesCount,
      isLiked,
    });
  }

  const primary = opinions[0] || {};
  return {
    ...primary,
    cycleId,
    timeRemainingMs,
    opinions,
  };
};

/**
 * Updates step weight on user's active opinion votes when they sync steps.
 * Called from userController.syncUserSteps.
 */
export const updateUserOpinionVotesOnStepSync = async (
  uid: string,
  todaysStepCount: unknown,
): Promise<void> => {
  if (!uid) return;
  const { cycleId } = getCurrentCycleInfo();
  const stepWeight = resolveVoteStepWeight(todaysStepCount);
  try {
    await StronOpinionVoteModel.updateMany(
      { cycleId, uid },
      { $set: { stepWeight } },
    );
  } catch (err: unknown) {
    logger.warn(
      "[opinion.service] Error updating opinion vote steps:",
      getErrorMessage(err),
    );
  }
};

/** Records or updates user opinion vote on a specific question. */
export const submitOpinionVote = async (
  uid: string,
  optionId: string,
  questionId: string,
) => {
  if (!questionId || typeof questionId !== "string" || !questionId.trim()) {
    throw codedError("validation_error", "questionId is required to vote on an opinion.");
  }
  const cleanQuestionId = questionId.trim();

  const { cycleId, cycleStartTime, cycleEndTime } = getCurrentCycleInfo();

  const userDoc = await UserModel.findOne({ uid });
  if (!userDoc) {
    throw codedError("user_not_found", "User not found.");
  }

  const cycleQuestions = await ensureCycleQuestions(cycleId, cycleStartTime, cycleEndTime);
  const targetQuestion = cycleQuestions.find(
    (q) => q.questionId === cleanQuestionId,
  );

  if (!targetQuestion) {
    throw codedError("invalid_field", "Active cycle question not found in database.");
  }

  const validOptions = normalizeOpinionOptions(targetQuestion.options as unknown[]);
  const validOption = validOptions.find((o) => o.optionId === optionId);
  if (!validOption) {
    throw codedError("invalid_field", "Invalid option selected.");
  }

  const stepsCount = resolveVoteStepWeight(userDoc.todaysStepCount);

  await StronOpinionVoteModel.findOneAndUpdate(
    { cycleId, questionId: cleanQuestionId, uid },
    {
      $set: {
        optionId: String(optionId),
        stepWeight: stepsCount,
        votedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  let newStreak = 1;
  if (userDoc.lastOpinionCycleId === cycleId - 1) {
    newStreak = (userDoc.opinionStreak || 0) + 1;
  } else if (userDoc.lastOpinionCycleId === cycleId) {
    newStreak = userDoc.opinionStreak || 1;
  } else {
    newStreak = 1;
  }

  userDoc.opinionStreak = newStreak;
  userDoc.lastOpinionCycleId = cycleId;
  await userDoc.save();

  return getOpinionPollDetails(uid);
};

/** Toggles like on an opinion question */
export const toggleOpinionLike = async (uid: string, questionId: string) => {
  const { cycleId } = getCurrentCycleInfo();

  if (!questionId) {
    throw codedError("bad_request", "questionId is required.");
  }

  const targetQuestion = await StronOpinionModel.findOne({ questionId });

  if (!targetQuestion) {
    throw codedError("not_found", "Opinion question not found.");
  }

  const targetQuestionId = targetQuestion.questionId;
  const targetCycleId = targetQuestion.cycleId || cycleId;

  const existingLike = await StronOpinionLikeModel.findOne({
    questionId: targetQuestionId,
    uid,
  });

  let isLiked = false;
  if (existingLike) {
    await StronOpinionLikeModel.deleteOne({ _id: existingLike._id });
    isLiked = false;
  } else {
    await StronOpinionLikeModel.create({
      cycleId: targetCycleId,
      questionId: targetQuestionId,
      uid,
    });
    isLiked = true;
  }

  const likesCount = await StronOpinionLikeModel.countDocuments({
    questionId: targetQuestionId,
  });
  targetQuestion.likesCount = likesCount;
  await targetQuestion.save();

  return {
    cycleId: targetCycleId,
    questionId: targetQuestionId,
    likesCount,
    isLiked,
  };
};

/**

 * Refresh stepWeight on all votes in a cycle from each voter's live todaysStepCount.
 * Used on hourly sync (1..12 IST) and again right before cycle settle.
 */
export const refreshOpinionVoteWeightsForCycle = async (cycleId: number) => {
  if (cycleId == null) return { updatedUsers: 0, voterCount: 0 };

  const voterUids = await StronOpinionVoteModel.distinct("uid", { cycleId });
  if (!voterUids.length) return { updatedUsers: 0, voterCount: 0 };

  const users = await UserModel.find({ uid: { $in: voterUids } })
    .select("uid todaysStepCount")
    .lean();
  const stepsByUid = Object.fromEntries(
    users.map((u) => [u.uid, resolveVoteStepWeight(u.todaysStepCount)]),
  );

  const ops = voterUids.map((uid) => ({
    updateMany: {
      filter: { cycleId, uid },
      update: { $set: { stepWeight: stepsByUid[uid] ?? 1 } },
    },
  }));

  if (ops.length) {
    await StronOpinionVoteModel.bulkWrite(ops, { ordered: false });
  }

  return { updatedUsers: voterUids.length, voterCount: voterUids.length };
};

/** Hourly job: sync vote weights for the live cycle from DB step counts. */
export const runHourlyOpinionStepSync = async () => {
  const { cycleId } = getCurrentCycleInfo();
  const result = await refreshOpinionVoteWeightsForCycle(cycleId);
  logger.info(
    `[opinion] hourly step sync cycle=${cycleId} voters=${result.voterCount}`,
  );
  return { cycleId, ...result };
};

const pickWinningResult = (
  results: OpinionResultRow[],
): OpinionResultRow | null => {
  if (!results.length) return null;
  return results.reduce((best, row) =>
    (row.voteWeight || 0) > (best.voteWeight || 0) ? row : best,
  );
};

/**
 * Settle an ended opinion cycle: final step-weight sync, persist winners,
 * notify only users who voted on each poll.
 */
export const settleOpinionCycle = async (
  cycleId: number,
  { notify = true }: { notify?: boolean } = {},
) => {
  if (cycleId == null) return { skipped: true, reason: "no_cycle" };

  const questions = await StronOpinionModel.find({ cycleId });
  if (!questions.length) return { skipped: true, reason: "no_questions", cycleId };

  const unsettled = questions.filter((q) => !q.settledAt && !(q.results || []).length);
  if (!unsettled.length) {
    return { skipped: true, reason: "already_settled", cycleId };
  }

  await refreshOpinionVoteWeightsForCycle(cycleId);

  const questionIds = unsettled.map((q) => q.questionId);
  const voteAgg = await StronOpinionVoteModel.aggregate([
    { $match: { cycleId, questionId: { $in: questionIds } } },
    {
      $group: {
        _id: { questionId: "$questionId", optionId: "$optionId" },
        totalWeight: { $sum: "$stepWeight" },
      },
    },
  ]);

  const weightByQuestion = new Map();
  for (const row of voteAgg) {
    const qId = String(row._id.questionId);
    const optId = String(row._id.optionId);
    if (!weightByQuestion.has(qId)) weightByQuestion.set(qId, {});
    weightByQuestion.get(qId)[optId] = row.totalWeight || 0;
  }

  let settledCount = 0;
  let notifiedCount = 0;
  const { notifyUser } = await import("../../managed-events/index.js");

  for (const question of unsettled) {
    const options = normalizeOpinionOptions(question.options as unknown[]);
    const weights = weightByQuestion.get(String(question.questionId)) || {};
    const totalVotesWeight = options.reduce(
      (sum, opt) => sum + (weights[String(opt.optionId)] || 0),
      0,
    );

    const results: OpinionResultRow[] = options.map((opt) => {
      const voteWeight = weights[String(opt.optionId)] || 0;
      const percentage =
        totalVotesWeight > 0 ? Math.round((voteWeight / totalVotesWeight) * 100) : 0;
      return {
        optionId: opt.optionId,
        text: opt.text,
        voteWeight,
        percentage,
      };
    });

    if (results.length === 2 && totalVotesWeight > 0) {
      results[1].percentage = Math.max(0, 100 - results[0].percentage);
    }

    const winner = pickWinningResult(results);
    const settledAt = new Date();

    await StronOpinionModel.updateOne(
      {
        _id: question._id,
        $or: [{ settledAt: null }, { settledAt: { $exists: false } }],
      },
      {
        $set: {
          results,
          totalVotesWeight,
          winningOptionId: winner?.optionId || null,
          settledAt,
          isActive: false,
        },
      },
    );
    settledCount += 1;

    if (!notify || !winner || totalVotesWeight <= 0) continue;

    const voterUids = await StronOpinionVoteModel.distinct("uid", {
      cycleId,
      questionId: question.questionId,
    });

    // Out-app push: short title + subtitle. In-app: structured data for expandable card.
    const title = "Poll results are in!";
    const body = `STRON Opinion #${question.questionNumber}`;
    const data = {
      kind: "opinion_result",
      questionId: question.questionId,
      questionNumber: question.questionNumber,
      questionText: question.questionText,
      cycleId,
      winningOptionId: winner?.optionId || null,
      options: results.map((r) => ({
        optionId: r.optionId,
        text: r.text,
        percentage: r.percentage,
        voteWeight: r.voteWeight,
      })),
    };

    for (let i = 0; i < voterUids.length; i += NOTIFY_CHUNK) {
      const chunk = voterUids.slice(i, i + NOTIFY_CHUNK);
      await Promise.all(
        chunk.map((uid) =>
          notifyUser(uid, title, body, { tag: "Opinion Result", data }),
        ),
      );
      notifiedCount += chunk.length;
    }
  }

  logger.info(
    `[opinion] settled cycle=${cycleId} polls=${settledCount} notifies=${notifiedCount}`,
  );

  return {
    cycleId,
    settledCount,
    notifiedCount,
    skipped: false,
  };
};

/** Cycle-boundary job: settle the cycle that just ended. */
export const runOpinionCycleSettleJob = async () => {
  const { cycleId } = getCurrentCycleInfo();
  const endedCycleId = cycleId - 1;
  return settleOpinionCycle(endedCycleId, { notify: true });
};

export default {
  getCurrentCycleInfo,
  getOpinionPollDetails,
  submitOpinionVote,
  updateUserOpinionVotesOnStepSync,
  refreshOpinionVoteWeightsForCycle,
  runHourlyOpinionStepSync,
  settleOpinionCycle,
  runOpinionCycleSettleJob,
  toggleOpinionLike,
  normalizeOpinionOptions,
  resolveVoteStepWeight,
  resolveAndPersistOpinionStreak,
};
