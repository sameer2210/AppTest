import React, { useState } from "react";
import { View, NativeModules, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { showToastMessage } from "@/utils/app-utils";
import { shareMessageWithLink } from "@/utils/shareMessage";
import {
  syncStepRaceLiveNotificationThunk,
  createStepRaceThunk,
  generateAndShareResultPdfCardThunk,
} from "@/features/stepRace";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { selectTodaySteps } from "@/features/steps";
import { captureEvent } from "@/analytics/posthog/events";

import { href } from "@/navigation/href";
import type { StepRace } from "@/models/stepRace";

type Props = {
  cardRef?: React.RefObject<View | null>;
  race?: StepRace | null;
  finalPaceText?: string;
  paceDiffText?: string;
};

const isViewShotNativeAvailable = () => {
  try {
    return Boolean(
      NativeModules?.RNViewShot,
    );
  } catch {
    return false;
  }
};

export const CompletedRaceFooter: React.FC<Props> = ({
  cardRef,
  race,
  finalPaceText = "--:--",
  paceDiffText,
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const todaySteps = useAppSelector(selectTodaySteps);

  const [isCreating, setIsCreating] = useState(false);

  const handleChallengeAgain = async () => {
    if (isCreating) return;
    captureEvent("rematch_tapped");

    const opponentUid = race?.opponent?.uid;
    const opponentType = race?.opponent?.type || "shadow";

    if (!opponentUid) {
      router.push(href.app.stepRace as never);
      return;
    }

    setIsCreating(true);
    try {
      const newRace = await dispatch(
        createStepRaceThunk({
          opponentUid,
          opponentType,
          duration: 24,
          userId: user?.uid,
          startSteps: todaySteps,
        }),
      ).unwrap();

      if (newRace) {
        void dispatch(syncStepRaceLiveNotificationThunk({ race: newRace, todaySteps }));
        router.push(href.app.ongoingStepRace as never);
      } else {
        router.push(href.app.stepRace as never);
      }
    } catch {
      showToastMessage("Could not start rematch. Opening opponent lobby.");
      router.push(href.app.stepRace as never);
    } finally {
      setIsCreating(false);
    }
  };

  const handleNewOpponent = () => {
    router.push(href.app.stepRace as never);
  };

  const handleShare = async () => {
    try {
      if (cardRef?.current && isViewShotNativeAvailable()) {
        const viewShot = await import("react-native-view-shot");
        const uri = await viewShot.captureRef(cardRef, {
          format: "png",
          quality: 1,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Stron 1K Step Race Result",
          });
          return;
        }
      }

      // Generate & share visual result card document dynamically
      const isWon = race?.winner === "user";
      const shared = await dispatch(
        generateAndShareResultPdfCardThunk({
          leadSteps: isWon ? "YOU WON!" : "YOU LOST",
          unit: "1,000 Steps",
          finalPace: finalPaceText || "04:28/km",
          paceDiff: paceDiffText || "Completed",
          opponentName: race?.opponent?.username || "Opponent",
          wins: isWon ? 1 : 0,
          losses: isWon ? 0 : 1,
        }),
      ).unwrap();

      if (!shared) {
        // Fallback message sharing
        const raceUrl = "https://stron.in";
        const message = `⚡ I just completed a 1K Step Race on Stron!\n🏆 Result: ${isWon ? "Won!" : "Completed!"}\n\nDownload Stron & challenge me to a race: ${raceUrl}`;
        await shareMessageWithLink({
          message,
          url: raceUrl,
          title: "Stron 1K Step Race Result",
        });
      }
    } catch {
      showToastMessage("Could not share result");
    }
  };

  return (
    <View style={styles.container}>
      {/* Primary Full-width Challenge Again Button */}
      <PressableScale
        style={styles.challengeButton}
        onPress={handleChallengeAgain}
        disabled={isCreating}
      >
        {isCreating ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="refresh-outline" size={22} color="white" />
            <CustomText
              style={[headingTextStyles.sixteenBoldBlack, styles.challengeButtonText]}
            >
              Challenge Again
            </CustomText>
          </>
        )}
      </PressableScale>

      {/* Secondary Bottom Action Row */}
      <View style={styles.secondaryActionsRow}>
        {/* Share Result */}
        <PressableScale
          style={styles.secondaryButton}
          onPress={handleShare}
        >
          <Ionicons name="share-social-outline" size={20} color="white" />
          <CustomText
            style={[fontTextStyles.fourteenNormalBlack, styles.secondaryButtonText]}
          >
            Share Result
          </CustomText>
        </PressableScale>

        {/* New Opponent */}
        <PressableScale
          style={styles.secondaryButton}
          onPress={handleNewOpponent}
        >
          <Ionicons name="people-outline" size={20} color="white" />
          <CustomText
            style={[fontTextStyles.fourteenNormalBlack, styles.secondaryButtonText]}
          >
            New Opponent
          </CustomText>
        </PressableScale>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
    gap: 12,
  },
  challengeButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#2A80FF",
    paddingVertical: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  challengeButtonText: {
    color: "#FFFFFF",
    marginLeft: 10,
  },
  secondaryActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(42, 101, 184, 0.5)",
    backgroundColor: "rgba(8, 46, 107, 0.6)",
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    marginLeft: 8,
  },
});

