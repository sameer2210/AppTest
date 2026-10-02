import { useCallback, useEffect, useRef, useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { ShimmerBox } from "@/components/ShimmerPlaceholder";
import { OpinionApi as OpinionService, formatOpinionVoteLabel, type OpinionPollData } from "@/features/user";
import { useAppDispatch } from "@/store/hooks";
import { syncCurrentStepsToServer } from "../../model/steps.thunks";
import { shareOpinion } from "@/utils/shareOpinion";
import { captureEvent } from "@/analytics/posthog/events";
import { showToastMessage } from "@/utils/app-utils";
import { logError } from "@/config/devLogger";

/** Strip emoji pictographs only — do not use broad Unicode ranges that eat real letters. */
const stripEmojis = (text?: string): string => {
  if (!text) return "";
  return String(text)
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .trim();
};

type EventPromptProps = {
  title: string;
  onCheckIn: () => void;
};

export const HomeEventStartedCard = ({ title, onCheckIn }: EventPromptProps) => (
  <View style={styles.eventStartedCard}>
    <View style={styles.eventStartedTextWrapper}>
      <CustomText style={styles.eventStartedTitle}>Your Event has Started</CustomText>
      <CustomText style={styles.eventStartedSub} numberOfLines={1}>
        {title}
      </CustomText>
    </View>
    <PressableScale style={styles.checkInButton} onPress={onCheckIn}>
      <CustomText style={styles.checkInText}>Check In</CustomText>
    </PressableScale>
  </View>
);

const formatCountdown = (ms: number) => {
  if (ms <= 0) return "Rotating soon";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins.toString().padStart(2, "0")}m left`;
};

const VOTE_REGISTERED_BANNER =
  "Congratulations 🎉, your vote is registered. You can switch your vote anytime.";
const VOTE_BANNER_MS = 2200;
/** Disable Android ripple — translucent tracks + default light ripple sticks white on some OEMs (e.g. Realme). */
const RIPPLE_NONE = { color: "transparent" as const };
const CHERRY_RED = "#FF2D55";

const OPINION_INFO_POINTS = [
  {
    icon: "walk-outline" as const,
    title: "1 step = 1 vote weight",
    body: "Your vote is weighted by today’s step count. More steps make your opinion count more.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Minimum weight of 1",
    body: "Even with 0 steps today, your vote still counts with a weight of 1.",
  },
  {
    icon: "time-outline" as const,
    title: "3 fresh opinions every 12 hours",
    body: "3 new opinion questions drop every 12 hours. You get one vote per question.",
  },
  {
    icon: "swap-horizontal-outline" as const,
    title: "1-Tap direct voting & shifting",
    body: "Tap either of the 2 options to vote directly. Changed your mind? Tap the other option to switch.",
  },
  {
    icon: "thumbs-up-outline" as const,
    title: "Like your favorite polls",
    body: "Tap the cherry-red thumbs-up icon to show appreciation for exciting debates and questions.",
  },
  {
    icon: "bar-chart-outline" as const,
    title: "Results are step-weighted",
    body: "Percentages reflect total step weight behind each option — not just headcount.",
  },
];

type SingleOpinionCardProps = {
  poll: OpinionPollData;
  remainingMs: number;
  onVote: (optionId: string, questionId: string) => Promise<void>;
  onToggleLike: (questionId: string) => Promise<void>;
  onOpenInfo: () => void;
  voting: boolean;
  likePending: boolean;
  showBanner: boolean;
  bannerMessage: string;
};

const SingleOpinionCard = ({
  poll,
  remainingMs,
  onVote,
  onToggleLike,
  onOpenInfo,
  voting,
  likePending,
  showBanner,
  bannerMessage,
}: SingleOpinionCardProps) => {
  const likeScale = useSharedValue(1);

  const handleLikePress = async () => {
    likeScale.value = withSpring(1.35, { damping: 8, stiffness: 300 }, (finished) => {
      if (finished) {
        likeScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      }
    });
    await onToggleLike(poll.questionId);
  };

  const likeIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const hasVoted = Boolean(poll.userVotedOptionId);

  return (
    <View style={styles.opinionCard}>
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <View style={styles.plusH} />
            <View style={styles.plusV} />
          </View>
          <View style={styles.titleCol}>
            <CustomText style={styles.pollTitle}>
              STRON Opinions {poll.questionNumber}
            </CustomText>
            <CustomText style={styles.pollSubtitle}>
              {formatOpinionVoteLabel(poll)}
            </CustomText>
          </View>
        </View>

        <CustomText style={styles.countdownText}>{formatCountdown(remainingMs)}</CustomText>
      </View>

      {showBanner ? (
        <Animated.View
          entering={FadeIn.duration(280)}
          exiting={FadeOut.duration(220)}
          style={styles.voteBanner}
        >
          <CustomText style={styles.voteBannerText}>{bannerMessage}</CustomText>
        </Animated.View>
      ) : null}

      {/* ── Question Text ── */}
      {poll.questionText ? (
        <CustomText style={styles.questionText}>
          {poll.questionText}
        </CustomText>
      ) : null}

      {/* ── Exactly 2 Options (1-Tap Direct Vote & Shifting) ── */}
      <View style={styles.optionsCol}>
        {poll.options.slice(0, 2).map((option, index) => {
          const rawText = typeof option === "string" ? option : option?.text || "";
          const label = stripEmojis(rawText) || rawText.trim() || `Option ${index + 1}`;
          const rowKey = option.optionId || `opt_${index + 1}`;
          const isUserSelection =
            Boolean(poll.userVotedOptionId) &&
            String(poll.userVotedOptionId).trim() === String(option.optionId).trim();
          const pct = Math.max(0, Math.min(100, Number(option.percentage) || 0));

          return (
            <Pressable
              key={rowKey}
              onPress={() => void onVote(option.optionId, poll.questionId)}
              disabled={voting}
              android_ripple={RIPPLE_NONE}
              style={styles.optionPressable}
            >
              <View style={styles.optionContainer}>
                {/* ── Track Background & Progress Fill ── */}
                <View
                  pointerEvents="none"
                  style={styles.optionTrackBg}
                />
                {hasVoted ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.optionProgress,
                      isUserSelection ? styles.userProgress : styles.normalProgress,
                      { width: `${Math.max(pct, 4)}%` },
                    ]}
                  />
                ) : null}

                {/* ── Foreground Content ── */}
                <View
                  pointerEvents="none"
                  style={styles.optionContent}
                >
                  <CustomText
                    style={styles.optionLabel}
                    numberOfLines={2}
                  >
                    {label}
                  </CustomText>

                  {hasVoted ? (
                    <View style={styles.votedRow}>
                      {isUserSelection ? (
                        <Ionicons name="checkmark-circle" size={16} color="#A8F090" />
                      ) : null}
                      <CustomText
                        style={[
                          styles.pctText,
                          isUserSelection ? styles.userPctText : null,
                        ]}
                      >
                        {pct}%
                      </CustomText>
                    </View>
                  ) : (
                    <View style={styles.unvotedRadio} />
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ── Footer Bar ── */}
      <View style={styles.footerRow}>
        <PressableScale
          style={styles.likeBtn}
          onPress={() => void handleLikePress()}
          disabled={likePending}
          accessibilityRole="button"
          accessibilityLabel={poll.isLiked ? "Unlike opinion" : "Like opinion"}
        >
          <Animated.View style={likeIconAnimatedStyle}>
            <Ionicons
              name={poll.isLiked ? "thumbs-up" : "thumbs-up-outline"}
              size={16}
              color={poll.isLiked ? CHERRY_RED : "#FFFFFF"}
            />
          </Animated.View>
          <CustomText
            style={[
              styles.likeCount,
              poll.isLiked ? styles.likeCountActive : null,
            ]}
          >
            {poll.likesCount || 0}
          </CustomText>
        </PressableScale>

        <PressableScale style={styles.shareBtn} onPress={() => void shareOpinion(poll.questionId)}>
          <Ionicons name="share-social-outline" size={16} color="white" />
          <CustomText style={styles.shareText}>Share</CustomText>
        </PressableScale>

        <PressableScale
          style={styles.infoBtn}
          onPress={onOpenInfo}
          accessibilityRole="button"
          accessibilityLabel="How opinion voting works"
        >
          <CustomText style={styles.infoText}>1 step = 1 vote</CustomText>
          <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.8)" />
        </PressableScale>
      </View>
    </View>
  );
};

type OpinionCardProps = {
  /** Live today steps — drives 1 step = 1 vote display after voting. */
  todaySteps?: number;
  onOpenFeedback?: () => void;
};

const resolveStepVoteWeight = (steps?: number) =>
  Math.max(1, Math.max(0, Math.floor(Number(steps) || 0)));

/** Bump the user's selected option weight to match live today steps. */
const applyLiveStepWeight = (polls: OpinionPollData[], todaySteps?: number): OpinionPollData[] => {
  const newWeight = resolveStepVoteWeight(todaySteps);
  let changed = false;
  const next = polls.map((poll) => {
    if (!poll.userVotedOptionId) return poll;
    const oldWeight = Math.max(1, Number(poll.userVoteWeight) || 1);
    if (newWeight <= oldWeight) return poll;
    changed = true;
    const delta = newWeight - oldWeight;
    const options = poll.options.map((opt) => {
      if (String(opt.optionId).trim() !== String(poll.userVotedOptionId).trim()) {
        return opt;
      }
      return {
        ...opt,
        voteWeight: Math.max(0, Number(opt.voteWeight) || 0) + delta,
      };
    });
    const totalVotesWeight = Math.max(0, Number(poll.totalVotesWeight) || 0) + delta;
    const optionsWithPct = options.map((opt) => ({
      ...opt,
      percentage:
        totalVotesWeight > 0
          ? Math.round((Math.max(0, opt.voteWeight) / totalVotesWeight) * 100)
          : 50,
    }));
    if (optionsWithPct.length === 2 && totalVotesWeight > 0) {
      optionsWithPct[1] = {
        ...optionsWithPct[1],
        percentage: Math.max(0, 100 - optionsWithPct[0].percentage),
      };
    }
    return {
      ...poll,
      userVoteWeight: newWeight,
      totalVotesWeight,
      options: optionsWithPct,
      totalVotesFormatted: `${totalVotesWeight} Votes`,
    };
  });
  return changed ? next : polls;
};

const HomeOpinionCard = ({ todaySteps = 0, onOpenFeedback }: OpinionCardProps) => {
  const dispatch = useAppDispatch();
  const [opinions, setOpinions] = useState<OpinionPollData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [votingMap, setVotingMap] = useState<Record<string, boolean>>({});
  const [likePendingMap, setLikePendingMap] = useState<Record<string, boolean>>({});
  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [activeBannerQuestionId, setActiveBannerQuestionId] = useState<string | null>(null);
  const [voteBannerMessage, setVoteBannerMessage] = useState<string>(VOTE_REGISTERED_BANNER);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const voteBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const todayStepsRef = useRef(todaySteps);
  todayStepsRef.current = todaySteps;
  const infoClosingRef = useRef<boolean>(false);

  const infoOverlayOpacity = useSharedValue(0);
  const infoCardScale = useSharedValue(0.92);
  const infoCardTranslateY = useSharedValue(28);

  const fetchOpinions = useCallback(async () => {
    try {
      const result = await OpinionService.getCurrentOpinions();
      if (result && result.opinions && result.opinions.length > 0) {
        const next = applyLiveStepWeight(result.opinions, todayStepsRef.current);
        setOpinions(next);
        setRemainingMs(result.timeRemainingMs);
      }
    } catch {
      // Silent on error; shimmer handles loading
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOpinions();
  }, [fetchOpinions]);

  // Keep voted polls' step-vote totals live as todaySteps rises (1 step = 1 vote).
  // Local weight bump only — avoid refetching opinions on every step tick while walking.
  useEffect(() => {
    const steps = Math.max(0, Math.floor(Number(todaySteps) || 0));
    setOpinions((prev) => applyLiveStepWeight(prev, steps));
  }, [todaySteps]);

  // Countdown timer effect
  useEffect(() => {
    if (remainingMs <= 0) return;
    const interval = setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - 60000));
    }, 60000);
    return () => clearInterval(interval);
  }, [remainingMs]);

  useEffect(() => {
    return () => {
      if (voteBannerTimerRef.current) clearTimeout(voteBannerTimerRef.current);
    };
  }, []);

  const showBanner = useCallback((questionId: string, msg?: string) => {
    if (msg) setVoteBannerMessage(msg);
    setActiveBannerQuestionId(questionId);
    if (voteBannerTimerRef.current) clearTimeout(voteBannerTimerRef.current);
    voteBannerTimerRef.current = setTimeout(() => {
      setActiveBannerQuestionId(null);
      voteBannerTimerRef.current = null;
    }, VOTE_BANNER_MS);
  }, []);

  const finishCloseInfoModal = useCallback(() => {
    setShowInfoModal(false);
    infoClosingRef.current = false;
  }, []);

  const openInfoModal = useCallback(() => {
    if (showInfoModal && !infoClosingRef.current) return;
    infoClosingRef.current = false;
    infoOverlayOpacity.value = 0;
    infoCardScale.value = 0.92;
    infoCardTranslateY.value = 28;
    setShowInfoModal(true);
  }, [infoCardScale, infoCardTranslateY, infoOverlayOpacity, showInfoModal]);

  useEffect(() => {
    if (!showInfoModal || infoClosingRef.current) return;
    infoOverlayOpacity.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
    infoCardScale.value = withSpring(1, { damping: 16, stiffness: 220, mass: 0.9 });
    infoCardTranslateY.value = withSpring(0, { damping: 16, stiffness: 220, mass: 0.9 });
  }, [showInfoModal, infoCardScale, infoCardTranslateY, infoOverlayOpacity]);

  const closeInfoModal = useCallback(() => {
    if (!showInfoModal || infoClosingRef.current) return;
    infoClosingRef.current = true;
    infoOverlayOpacity.value = withTiming(0, {
      duration: 180,
      easing: Easing.in(Easing.cubic),
    });
    infoCardScale.value = withTiming(0.94, { duration: 180 });
    infoCardTranslateY.value = withTiming(
      20,
      { duration: 180, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishCloseInfoModal)();
      },
    );
  }, [finishCloseInfoModal, infoCardScale, infoCardTranslateY, infoOverlayOpacity, showInfoModal]);

  const infoOverlayStyle = useAnimatedStyle(() => ({
    opacity: infoOverlayOpacity.value,
  }));

  const infoCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: infoCardTranslateY.value }, { scale: infoCardScale.value }],
  }));

  const handleVote = async (optionId: string, questionId: string) => {
    if (votingMap[questionId]) return;

    const targetPoll = opinions.find((p) => p.questionId === questionId);
    if (!targetPoll) return;

    if (
      targetPoll.userVotedOptionId &&
      String(targetPoll.userVotedOptionId).trim() === String(optionId).trim()
    ) {
      showBanner(questionId, "Your vote is already registered for this option.");
      return;
    }

    const isShift = Boolean(targetPoll.userVotedOptionId);
    const previousOpinions = opinions;
    setVotingMap((prev) => ({ ...prev, [questionId]: true }));

    // 1. Immediate optimistic UI update (0ms latency, responsive feel)
    const liveWeight = resolveStepVoteWeight(todaySteps);
    setOpinions((prev) =>
      applyLiveStepWeight(
        prev.map((op) => {
          if (op.questionId !== questionId) return op;
          const prevVotedOpt = op.userVotedOptionId;
          const updatedOptions = op.options.map((opt) => {
            let weight = Number(opt.voteWeight) || 0;
            if (String(opt.optionId) === String(optionId)) {
              weight += liveWeight;
            } else if (prevVotedOpt && String(opt.optionId) === String(prevVotedOpt)) {
              weight = Math.max(0, weight - (Number(op.userVoteWeight) || liveWeight));
            }
            return { ...opt, voteWeight: weight };
          });
          const totalWeight = updatedOptions.reduce((sum, o) => sum + o.voteWeight, 0);
          const withPct = updatedOptions.map((opt) => ({
            ...opt,
            percentage: totalWeight > 0 ? Math.round((opt.voteWeight / totalWeight) * 100) : 50,
          }));
          if (withPct.length === 2 && totalWeight > 0) {
            withPct[1].percentage = Math.max(0, 100 - withPct[0].percentage);
          }
          return {
            ...op,
            userVotedOptionId: optionId,
            userVoteWeight: liveWeight,
            options: withPct,
            totalVotesWeight: totalWeight,
            totalVotesFormatted: `${totalWeight} Votes`,
          };
        }),
        todaySteps,
      ),
    );

    try {
      // Push latest steps first so vote weight = today's steps (1 step = 1 vote)
      await dispatch(syncCurrentStepsToServer()).unwrap().catch(() => undefined);
      const result = await OpinionService.submitVote(optionId, questionId);
      if (result && result.opinions && result.opinions.length > 0) {
        setOpinions(applyLiveStepWeight(result.opinions, todaySteps));
        setRemainingMs(result.timeRemainingMs);
      }
      captureEvent("opinion_vote_submitted", {
        opinion_id: questionId,
        option: optionId,
      });
      showBanner(
        questionId,
        isShift ? "Vote shifted 🎉. Your selection has been updated." : VOTE_REGISTERED_BANNER,
      );
    } catch (error: any) {
      logError("handleVote failed", error);
      // Rollback optimistic update on failure so UI accurately reflects server state
      setOpinions(previousOpinions);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Could not register your vote. Check connection and try again.";
      showToastMessage(message);
    } finally {
      setVotingMap((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const handleToggleLike = async (questionId: string) => {
    if (likePendingMap[questionId]) return;

    const targetPoll = opinions.find((p) => p.questionId === questionId);
    if (!targetPoll) return;

    const prevLiked = Boolean(targetPoll.isLiked);
    const prevCount = Number(targetPoll.likesCount) || 0;
    const nextLiked = !prevLiked;
    const nextCount = nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    // Optimistic UI update for this specific card
    setOpinions((prev) =>
      prev.map((op) =>
        op.questionId === questionId ? { ...op, isLiked: nextLiked, likesCount: nextCount } : op,
      ),
    );

    setLikePendingMap((prev) => ({ ...prev, [questionId]: true }));
    try {
      const res = await OpinionService.toggleLike(questionId);
      if (res) {
        setOpinions((prev) =>
          prev.map((op) =>
            op.questionId === questionId
              ? { ...op, isLiked: res.isLiked, likesCount: res.likesCount }
              : op,
          ),
        );
        captureEvent(res.isLiked ? "opinion_liked" : "opinion_unliked", {
          opinion_id: questionId,
        });
      }
    } catch {
      // Revert on error
      setOpinions((prev) =>
        prev.map((op) =>
          op.questionId === questionId ? { ...op, isLiked: prevLiked, likesCount: prevCount } : op,
        ),
      );
    } finally {
      setLikePendingMap((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  // ── Show Shimmer Loading Skeleton Cards (never flash hardcoded question) ──
  if (loading || opinions.length === 0) {
    return (
      <View style={styles.shimmerList}>
        {[1, 2, 3].map((cardIdx) => (
          <View
            key={`shimmer_card_${cardIdx}`}
            style={styles.opinionCard}
          >
            <View style={styles.shimmerHeader}>
              <View style={styles.shimmerHeaderLeft}>
                <ShimmerBox width={38} height={38} borderRadius={19} style={{ marginRight: 12 }} />
                <View>
                  <ShimmerBox
                    width={140}
                    height={16}
                    borderRadius={4}
                    style={{ marginBottom: 6 }}
                  />
                  <ShimmerBox width={80} height={12} borderRadius={4} />
                </View>
              </View>
              <ShimmerBox width={70} height={14} borderRadius={4} />
            </View>
            <ShimmerBox
              width="90%"
              height={20}
              borderRadius={6}
              style={{ marginTop: 6, marginBottom: 14 }}
            />
            <ShimmerBox width="100%" height={50} borderRadius={8} style={{ marginBottom: 8 }} />
            <ShimmerBox width="100%" height={50} borderRadius={8} style={{ marginBottom: 14 }} />
            <View style={styles.shimmerFooter}>
              <ShimmerBox width={50} height={16} borderRadius={4} />
              <ShimmerBox width={60} height={16} borderRadius={4} />
              <ShimmerBox width={80} height={14} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.cardsContainer}>
      {/* ── Render all 3 opinion cards ── */}
      {opinions.map((poll) => (
        <SingleOpinionCard
          key={poll.questionId}
          poll={poll}
          remainingMs={remainingMs}
          onVote={handleVote}
          onToggleLike={handleToggleLike}
          onOpenInfo={openInfoModal}
          voting={Boolean(votingMap[poll.questionId])}
          likePending={Boolean(likePendingMap[poll.questionId])}
          showBanner={activeBannerQuestionId === poll.questionId}
          bannerMessage={voteBannerMessage}
        />
      ))}

      {/* ── Info Modal ── */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeInfoModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.8)" },
              infoOverlayStyle,
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={StyleSheet.absoluteFillObject}
            onPress={closeInfoModal}
          />
          <Animated.View
            style={[styles.infoCard, infoCardStyle]}
          >
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.infoCloseBtn}
              onPress={closeInfoModal}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </PressableScale>

            <View style={styles.infoIconCircle}>
              <Ionicons name="information-circle-outline" size={30} color="#71BAFF" />
            </View>

            <CustomText style={styles.infoModalTitle}>
              How Opinion works
            </CustomText>
            <CustomText style={styles.infoModalSubtitle}>
              Vote with your steps. Stronger activity, stronger voice.
            </CustomText>

            <View style={styles.infoPointsList}>
              {OPINION_INFO_POINTS.map((point) => (
                <View key={point.title} style={styles.infoPointRow}>
                  <View style={styles.infoPointIcon}>
                    <Ionicons name={point.icon} size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.infoPointContent}>
                    <CustomText style={styles.infoPointTitle}>{point.title}</CustomText>
                    <CustomText style={styles.infoPointBody}>
                      {point.body}
                    </CustomText>
                  </View>
                </View>
              ))}
            </View>

            <PressableScale
              style={styles.infoGotItBtn}
              onPress={closeInfoModal}
            >
              <CustomText style={styles.infoGotItText}>Got it</CustomText>
            </PressableScale>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  eventStartedCard: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  eventStartedTextWrapper: {
    flex: 1,
    paddingRight: 16,
  },
  eventStartedTitle: {
    ...fontTextStyles.headingSmall,
    fontSize: 20,
    color: "#18202B",
  },
  eventStartedSub: {
    ...fontTextStyles.bodyText,
    fontSize: 16,
    color: "#8C95A1",
    marginTop: 2,
  },
  checkInButton: {
    borderRadius: 24,
    backgroundColor: "#000000",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  checkInText: {
    ...fontTextStyles.buttonText,
    fontSize: 15,
    color: "#FFFFFF",
  },
  cardsContainer: {
    marginBottom: 8,
  },
  opinionCard: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(4, 14, 32, 0.95)",
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  iconBadge: {
    marginRight: 12,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#182A4A",
    position: "relative",
  },
  plusH: {
    width: 14,
    height: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  plusV: {
    width: 5,
    height: 14,
    backgroundColor: "#FFFFFF",
    position: "absolute",
    borderRadius: 2,
  },
  titleCol: {
    flex: 1,
  },
  pollTitle: {
    ...fontTextStyles.headingSmall,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  pollSubtitle: {
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  countdownText: {
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  questionText: {
    marginTop: 12,
    ...fontTextStyles.bodyMedium,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
  optionsCol: {
    marginTop: 12,
    gap: 8,
  },
  optionPressable: {
    width: "100%",
  },
  optionContainer: {
    position: "relative",
    minHeight: 50,
    width: "100%",
    overflow: "hidden",
    borderRadius: 8,
  },
  optionTrackBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    backgroundColor: "rgba(53, 74, 123, 0.4)",
  },
  optionProgress: {
    position: "absolute",
    bottom: 0,
    left: 0,
    top: 0,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  userProgress: {
    borderRightWidth: 2,
    borderRightColor: "#9EFF53",
    backgroundColor: "rgba(113, 186, 104, 0.6)",
  },
  normalProgress: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  optionContent: {
    position: "relative",
    zIndex: 20,
    minHeight: 50,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionLabel: {
    flex: 1,
    paddingRight: 8,
    ...fontTextStyles.bodyMedium,
    fontSize: 13.5,
    color: "#FFFFFF",
  },
  votedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pctText: {
    ...fontTextStyles.bodyBold,
    fontSize: 13.5,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  userPctText: {
    color: "#A8F090",
  },
  unvotedRadio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  footerRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingRight: 12,
  },
  likeCount: {
    ...fontTextStyles.bodyMedium,
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  likeCountActive: {
    color: "#FF2D55",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  shareText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 14,
    color: "#FFFFFF",
    marginLeft: 6,
  },
  infoBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    ...fontTextStyles.bodySmall,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    marginRight: 6,
  },
  shimmerList: {
    marginBottom: 8,
    gap: 12,
  },
  shimmerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  shimmerHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  shimmerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  infoCard: {
    zIndex: 2,
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#061B42",
    padding: 24,
    paddingTop: 20,
  },
  infoCloseBtn: {
    position: "absolute",
    right: 16,
    top: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  infoIconCircle: {
    marginTop: 8,
    marginBottom: 12,
    width: 56,
    height: 56,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(113, 186, 255, 0.3)",
    backgroundColor: "rgba(113, 186, 255, 0.15)",
  },
  infoModalTitle: {
    ...fontTextStyles.headingSmall,
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "700",
  },
  infoModalSubtitle: {
    ...fontTextStyles.bodyText,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
  },
  infoPointsList: {
    gap: 12,
  },
  infoPointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoPointIcon: {
    marginTop: 2,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  infoPointContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoPointTitle: {
    ...fontTextStyles.bodyMedium,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  infoPointBody: {
    ...fontTextStyles.bodySmall,
    fontSize: 12.5,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
    lineHeight: 17,
  },
  infoGotItBtn: {
    marginTop: 20,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  infoGotItText: {
    ...fontTextStyles.buttonText,
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  voteBanner: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(143, 224, 122, 0.45)",
    backgroundColor: "rgba(113, 186, 104, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  voteBannerText: {
    ...fontTextStyles.sixteenSemiBoldBlack,
    textAlign: "center",
    color: "#A8F090",
  },
});

export default HomeOpinionCard;
