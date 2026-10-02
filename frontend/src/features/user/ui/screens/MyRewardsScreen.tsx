import { useCallback, useState } from "react";
import { Image, ImageBackground, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { RewardListSkeleton } from "@/components/skeletons";
import { useAppDispatch } from "@/store/hooks";
import { fetchMyRewards } from "@/features/managedEvents";
import type { StronReward } from "@/models/stronManaged/reward";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import {
  SCREEN_CONTENT_PADDING_TOP,
  SCREEN_CONTENT_PADDING_BOTTOM,
  SCREEN_HORIZONTAL_PADDING,
  screenContentContainerStyle,
} from "@/utils/screen-layout";
import { images } from "@/utils/images";
import { showToastMessage } from "@/utils/app-utils";
import { captureEvent } from "@/analytics/posthog/events";
import ECertificateModal, {
  buildCertificateResultLine,
  formatLabelFromKey,
} from "@/components/eventRewards/ECertificateModal";
import RewardPreviewModal from "../components/RewardPreviewModal";
import { formatRewardSubtitle, medalImageForReward } from "@/utils/rewards.utils";

/**
 * My Rewards — Figma 460:2178 (list) + 534:2876 (preview modal).
 * Medals for top 3; certificates for all participants.
 */
const MyRewardsScreen = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<StronReward[]>([]);
  const [preview, setPreview] = useState<StronReward | null>(null);
  const [certReward, setCertReward] = useState<StronReward | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dispatch(fetchMyRewards()).unwrap();
      setRewards(data.rewards);
    } catch (error) {
      showToastMessage(error instanceof Error ? error.message : "Could not load rewards.");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Prefer medals in the list cards; fall back to certificates so everyone sees entries.
  const listItems = (() => {
    const byEvent = new Map<string, StronReward>();
    for (const r of rewards) {
      const existing = byEvent.get(r.eventKey);
      if (!existing) {
        byEvent.set(r.eventKey, r);
        continue;
      }
      // Prefer medal over certificate for the card visual.
      if (existing.type === "certificate" && r.type === "medal") {
        byEvent.set(r.eventKey, r);
      }
    }
    return Array.from(byEvent.values());
  })();

  const onDownloadCertificate = (reward: StronReward) => {
    const cert =
      rewards.find((r) => r.eventKey === reward.eventKey && r.type === "certificate") || reward;
    setCertReward(cert);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090909" translucent />
      <View
        style={[
          styles.headerBar,
          { paddingTop: topInset + 8 },
        ]}
      >
        <PressableScale
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </PressableScale>
        <View style={styles.headerTitleCol}>
          <CustomText
            style={[
              headingTextStyles.h1,
              styles.headerTitle,
            ]}
          >
            My Rewards
          </CustomText>
        </View>
      </View>

      {loading ? (
        <RewardListSkeleton count={4} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            screenContentContainerStyle,
            {
              paddingTop: 8,
              paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 40,
              flexGrow: 1,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {listItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <CustomText
                style={[
                  fontTextStyles.sixteenNormalBlack,
                  styles.emptyText,
                ]}
              >
                Finish an event to unlock medals and certificates.
              </CustomText>
            </View>
          ) : (
            listItems.map((reward, index) => (
              <Animated.View
                key={reward.id}
                entering={FadeInDown.delay(40 * index).duration(320)}
                layout={LinearTransition}
                style={styles.rewardCard}
              >
                <ImageBackground
                  source={images.REWARDS.MEDAL_BG}
                  style={styles.medalBackground}
                  resizeMode="cover"
                >
                  <Image
                    source={
                      reward.type === "medal"
                        ? medalImageForReward(reward)
                        : images.REWARDS.CERTIFICATE
                    }
                    style={styles.medalImage}
                    resizeMode="contain"
                  />
                </ImageBackground>

                <View style={styles.rewardContent}>
                  <View>
                    <CustomText
                      style={[
                        headingTextStyles.eighteenBoldBlack,
                        styles.rewardTitle,
                      ]}
                      numberOfLines={1}
                    >
                      {reward.eventTitle}
                    </CustomText>
                    <CustomText
                      style={[
                        fontTextStyles.fourteenNormalBlack,
                        styles.rewardSubtitle,
                      ]}
                      numberOfLines={1}
                    >
                      {formatRewardSubtitle(reward)}
                    </CustomText>
                  </View>

                  <View style={styles.rewardActionsRow}>
                    <PressableScale
                      onPress={() => {
                        captureEvent("reward_previewed", {
                          event_key: reward.eventKey,
                          type: reward.type,
                        });
                        setPreview(reward);
                      }}
                      style={styles.previewButton}
                    >
                      <CustomText
                        style={[
                          fontTextStyles.twelveMediumBlack,
                          styles.previewButtonText,
                        ]}
                      >
                        Preview
                      </CustomText>
                    </PressableScale>
                    <PressableScale
                      onPress={() => onDownloadCertificate(reward)}
                      style={styles.downloadCertButton}
                    >
                      <CustomText
                        style={[
                          fontTextStyles.twelveNormalBlack,
                          styles.downloadCertText,
                        ]}
                      >
                        Download Certificate
                      </CustomText>
                    </PressableScale>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}

      <RewardPreviewModal
        visible={Boolean(preview)}
        reward={preview}
        onClose={() => setPreview(null)}
      />

      <ECertificateModal
        visible={Boolean(certReward)}
        recipientName={certReward?.displayName || "Athlete"}
        eventName={certReward?.eventTitle || "STRON Event"}
        organizerName={certReward?.venue}
        formatLabel={formatLabelFromKey(certReward?.format)}
        rank={certReward?.rank}
        resultLine={
          certReward
            ? buildCertificateResultLine({
              format: certReward.format,
              stats: certReward.stats,
            })
            : null
        }
        onClose={() => setCertReward(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090909",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: 12,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleCol: {
    flex: 1,
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textAlign: "right",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
  rewardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    height: 85,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 12,
  },
  medalBackground: {
    width: 105,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  medalImage: {
    width: 70,
    height: 90,
  },
  rewardContent: {
    flex: 1,
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 6,
    justifyContent: "space-between",
  },
  rewardTitle: {
    color: "#000000",
  },
  rewardSubtitle: {
    color: "rgba(0, 0, 0, 0.6)",
    marginTop: 2,
  },
  rewardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  previewButton: {
    height: 28,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#086CFF",
    alignItems: "center",
    justifyContent: "center",
  },
  previewButtonText: {
    color: "#FFFFFF",
  },
  downloadCertButton: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#F0F4FF",
    borderWidth: 1,
    borderColor: "rgba(8, 108, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  downloadCertText: {
    color: "#086CFF",
  },
});

export default MyRewardsScreen;

