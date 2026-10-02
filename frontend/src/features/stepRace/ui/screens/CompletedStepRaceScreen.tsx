import { useRef, useState, useEffect } from "react";
import { View, StatusBar, ScrollView, Image, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import confettiAnimation from "../../../../../assets/animetion/Confetti.json";
import { PressableScale, ScreenImageBackground } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import {
  SCREEN_CONTENT_PADDING_TOP,
  SCREEN_CONTENT_PADDING_BOTTOM,
  SCREEN_HORIZONTAL_PADDING,
} from "@/utils/screen-layout";
import { useLocalSearchParams, useRouter } from "expo-router";
import { images } from "@/utils/images";
import { href } from "@/navigation/href";
import { showToastMessage } from "@/utils/app-utils";
import { TOAST_PRESETS } from "@/utils/constants";
import { logError } from "@/config/devLogger";
import type { StepRace } from "@/models/stepRace";
import { resolveStepRaceOpponentAvatarSource } from "../../api/stepRace.api";
import {
  incrementUserWinsCountThunk,
  saveMatchHistoryThunk,
  getRivalryHistoryThunk,
} from "../../model/stepRace.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import { ActiveRaceHero } from "../components/screens/ActiveRaceHero";
import { CompletedRaceFooter } from "../components/screens/CompletedRaceFooter";
import { ShareResultCard } from "../components/screens/ShareResultCard";

const CELEBRITY_UNLOCK_TOAST_KEY = "stron_celebrity_athletes_unlock_toast_shown";

const formatPace = (s: number) => {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  const formattedSecs = String(secs).padStart(2, "0");
  return `${String(mins).padStart(2, "0")}:${formattedSecs}`;
};

const CompletedStepRaceScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams();
  const user = useAppSelector(selectAuthUser);
  const shareCardRef = useRef<View>(null);

  // Parse passed race data
  let race: StepRace | null = null;
  try {
    if (typeof params.raceData === "string") {
      race = JSON.parse(params.raceData) as StepRace;
    }
  } catch (e) {
    logError("Failed to parse completed race data", e);
  }

  const isWon = race?.winner === "user";
  const userSteps = race?.userSteps ?? 0;
  const userTime = race?.userTimeSeconds || 0;
  const oppPace = race?.opponentPaceSeconds || 600;

  const targetSteps = race?.targetSteps && race.targetSteps !== 200 ? race.targetSteps : 1000;

  // Calculate actual opponent steps at completion time
  const oppSteps =
    race?.opponentSteps ||
    (isWon
      ? userTime > 0
        ? Math.min(targetSteps - 10, Math.round((userTime / oppPace) * targetSteps))
        : targetSteps - 10
      : targetSteps);

  const leadDiff = isWon
    ? userSteps >= oppSteps
      ? userSteps - oppSteps
      : 50
    : oppSteps >= userSteps
      ? oppSteps - userSteps
      : 50;

  // 1. Calculate projected time for target steps based on user's measured speed
  const projectedTimeForTarget = (() => {
    if (userSteps > 0 && userTime > 0) {
      return Math.round((userTime / userSteps) * targetSteps);
    }
    return isWon ? Math.round(oppPace * 0.85) : Math.round(oppPace * 1.15);
  })();

  const finalPaceText = formatPace(projectedTimeForTarget);

  // 2. Performance percentage comparison against opponent target pace
  const rawPaceDiff = Math.round(((oppPace - projectedTimeForTarget) / oppPace) * 100);
  const diffPercent =
    rawPaceDiff > 0
      ? `${rawPaceDiff}% Faster`
      : rawPaceDiff < 0
        ? `${Math.abs(rawPaceDiff)}% Slower`
        : "equal Pace";

  const userAvatarSource = getProfileImageSource(user?.profileImageUrl, user?.uid);
  const opponentAvatarSource = resolveStepRaceOpponentAvatarSource(
    race?.opponent?.uid,
    race?.opponent?.profileImageUrl,
  );
  const opponentName = race?.opponent?.username || "Harshit";

  const [rivalryData, setRivalryData] = useState<{
    wins: number;
    losses: number;
    history: ("win" | "loss")[];
  }>({
    wins: isWon ? 1 : 0,
    losses: isWon ? 0 : 1,
    history: [isWon ? "win" : "loss"],
  });

  const finalizedRaceIdRef = useRef<string | null>(null);

  useEffect(() => {
    const raceId = race?.raceId;
    if (!raceId || finalizedRaceIdRef.current === raceId) return;
    finalizedRaceIdRef.current = raceId;

    let isMounted = true;

    const finalize = async () => {
      if (isWon) {
        try {
          const cnt = await dispatch(incrementUserWinsCountThunk()).unwrap();
          if (isMounted && cnt >= 3) {
            const alreadyShown = await AsyncStorage.getItem(CELEBRITY_UNLOCK_TOAST_KEY);
            if (!alreadyShown) {
              await AsyncStorage.setItem(CELEBRITY_UNLOCK_TOAST_KEY, "1");
              if (isMounted) {
                showToastMessage(
                  "👑 Celebrity Athletes Unlocked! Challenge legends like Usain Bolt & Ronaldo!",
                  TOAST_PRESETS.SUCCESS,
                );
              }
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (race?.opponent?.username) {
        void dispatch(
          saveMatchHistoryThunk({
            id: raceId,
            opponentUid: race.opponent.uid || "opponent",
            opponentName: race.opponent.username,
            opponentAvatar: race.opponent.profileImageUrl,
            isWin: isWon,
            stepDiff: leadDiff,
            completedAt: "Just now",
            finalPace: finalPaceText,
            paceDiff: diffPercent,
            paceSeconds: projectedTimeForTarget,
          }),
        );
      }
    };

    void finalize();

    return () => {
      isMounted = false;
    };
  }, [
    isWon,
    race?.raceId,
    race?.opponent?.uid,
    race?.opponent?.username,
    race?.opponent?.profileImageUrl,
    leadDiff,
    finalPaceText,
    diffPercent,
    projectedTimeForTarget,
    dispatch,
  ]);

  useEffect(() => {
    let isMounted = true;
    if (race?.opponent?.uid) {
      dispatch(getRivalryHistoryThunk(race.opponent.uid))
        .unwrap()
        .then((res: { wins: number; losses: number; history: ("win" | "loss")[] }) => {
          if (isMounted && res) {
            setRivalryData(res);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [race?.opponent?.uid, dispatch]);

  const totalBars = 7;
  const rivalryBars: string[] = [];
  for (let i = 0; i < totalBars; i++) {
    if (i < rivalryData.history.length) {
      rivalryBars.push(rivalryData.history[i] === "win" ? "#2DE441" : "#FF5C5C");
    } else {
      rivalryBars.push("rgba(255, 255, 255, 0.15)");
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScreenImageBackground source={images.HOME_V2.BG} flipY edgeToEdge={true} />

      {/* Confetti Animation on Victory */}
      {isWon && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 15 }]} pointerEvents="none">
          <LottieView
            source={confettiAnimation}
            autoPlay
            loop={false}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Floating Header */}
      <View
        style={[
          styles.headerRow,
          { top: SCREEN_CONTENT_PADDING_TOP + 8 },
        ]}
      >
        <PressableScale
          style={styles.backButton}
          onPress={() => router.replace(href.app.home as never)}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </PressableScale>

        <View style={styles.statusBadge}>
          <CustomText
            style={[fontTextStyles.fourteenNormalBlack, styles.statusBadgeText]}
          >
            Completed
          </CustomText>
        </View>
      </View>

      {/* Main Full-Height ScrollView */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: SCREEN_CONTENT_PADDING_TOP + 60,
          paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <ActiveRaceHero
          userSteps={isWon ? Math.max(targetSteps, userSteps) : userSteps}
          opponentSteps={oppSteps}
          isLeading={isWon}
          userTimeSeconds={userTime}
          targetSteps={targetSteps}
        />

        {/* Final Pace Card */}
        <View style={styles.finalPaceCard}>
          <View>
            <CustomText
              style={[fontTextStyles.twelveMediumBlack, styles.finalPaceLabel]}
            >
              Final Pace
            </CustomText>
            <CustomText
              style={[headingTextStyles.twentyTwoBoldWhite, styles.finalPaceValue]}
            >
              {finalPaceText}
            </CustomText>
          </View>

          <View style={styles.diffBadge}>
            <CustomText
              style={[fontTextStyles.fourteenMediumBlack, styles.diffBadgeText]}
            >
              {diffPercent}
            </CustomText>
          </View>
        </View>

        {/* Versus & Rivalry Card */}
        <View style={styles.versusCard}>
          <View style={styles.versusRow}>
            {/* You */}
            <View style={styles.versusColumn}>
              <View style={styles.avatarWrapper}>
                <Image
                  source={userAvatarSource || images.HOME_V2.AVATAR_SAMPLE}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              </View>
              <CustomText
                style={[fontTextStyles.sixteenBoldBlack, styles.userLabel]}
              >
                You
              </CustomText>
            </View>

            {/* VS */}
            <CustomText
              style={[headingTextStyles.thirtySixBoldWhite, styles.vsLabel]}
            >
              VS
            </CustomText>

            {/* Opponent */}
            <View style={styles.versusColumn}>
              <View style={styles.avatarWrapper}>
                <Image
                  source={opponentAvatarSource || images.HOME_V2.AVATAR_SAMPLE}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              </View>
              <CustomText
                style={[fontTextStyles.sixteenBoldBlack, styles.oppLabel]}
                numberOfLines={1}
              >
                {opponentName}
              </CustomText>
            </View>
          </View>

          {/* Rivalry Track */}
          <View style={styles.rivalryTrackSection}>
            <View style={styles.rivalryHeaderRow}>
              <CustomText
                style={[fontTextStyles.fourteenNormalBlack, styles.rivalryLabel]}
              >
                Rivalry
              </CustomText>
              <CustomText
                style={[fontTextStyles.fourteenBoldBlack, styles.rivalryScore]}
              >
                {rivalryData.wins}W • {rivalryData.losses}L
              </CustomText>
            </View>

            <View style={styles.rivalryBarsRow}>
              {rivalryBars.map((color, idx) => (
                <View
                  key={idx}
                  style={[styles.rivalryBar, { backgroundColor: color }]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Offscreen / Hidden Share Card Element for Image Capture */}
        <View style={styles.offscreenShareWrapper}>
          <ShareResultCard
            ref={shareCardRef}
            isWon={isWon}
            leadDiff={leadDiff}
            finalPace={finalPaceText}
            paceDiff={diffPercent}
            userAvatar={userAvatarSource}
            opponentName={opponentName}
            opponentAvatar={opponentAvatarSource}
            wins={rivalryData.wins}
            losses={rivalryData.losses}
            rivalryHistory={rivalryData.history}
          />
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Buttons */}
      <View style={{ paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM }}>
        <CompletedRaceFooter
          cardRef={shareCardRef}
          race={race}
          finalPaceText={finalPaceText}
          paceDiffText={diffPercent}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 20,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "transparent",
  },
  statusBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  finalPaceCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#041538",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  finalPaceLabel: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  finalPaceValue: {
    color: "#FFFFFF",
    marginTop: 2,
  },
  diffBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  diffBadgeText: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  versusCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#041538",
    padding: 24,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  versusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  versusColumn: {
    alignItems: "center",
    flex: 1,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    overflow: "hidden",
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#0D244F",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  userLabel: {
    color: "#397EFF",
    marginTop: 8,
  },
  vsLabel: {
    color: "#FFFFFF",
    marginHorizontal: 12,
    marginBottom: 24,
  },
  oppLabel: {
    color: "#FF5C5C",
    marginTop: 8,
  },
  rivalryTrackSection: {
    marginTop: 24,
  },
  rivalryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  rivalryLabel: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  rivalryScore: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  rivalryBarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  rivalryBar: {
    height: 6,
    flex: 1,
    borderRadius: 999,
  },
  offscreenShareWrapper: {
    position: "absolute",
    left: -9999,
    top: -9999,
    width: 360,
  },
});

export default CompletedStepRaceScreen;
