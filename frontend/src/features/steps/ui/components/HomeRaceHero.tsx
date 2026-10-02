import { memo, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { images } from "@/utils/images";

type Props = {
  avatarSource: ImageSourcePropType;
  name: string;
  todaySteps: string;
  onProfilePress: () => void;
  onNotificationPress: () => void;
  onStartRacePress: () => void;
  racesToday?: number;
  totalRaces?: number;
  wins?: number;
  losses?: number;
  bestPace?: string;
  shadowSubtext?: string;
  /** Hide START RACE card when a separate live race card is shown. */
  hideRaceCard?: boolean;
};

const AVATAR = 54;

const HomeRaceHero = ({
  avatarSource,
  name,
  todaySteps,
  onProfilePress,
  onNotificationPress,
  onStartRacePress,
  racesToday = 0,
  totalRaces = 0,
  wins = 0,
  losses = 0,
  bestPace = "10m 00s/km",
  shadowSubtext = "Ran 10 races when you were away",
  hideRaceCard = false,
}: Props) => {
  const [showShadowModal, setShowShadowModal] = useState(false);
  const isFirstRace = totalRaces === 0 && racesToday === 0 && wins === 0 && losses === 0;

  return (
    <View style={styles.container}>
      {/* Header — Figma 1416:385 */}
      <View style={styles.header}>
        <PressableScale style={styles.profilePressable} onPress={onProfilePress}>
          <View style={styles.avatarClip}>
            <Image
              key={
                typeof avatarSource === "object" && avatarSource !== null && "uri" in avatarSource
                  ? (avatarSource as { uri: string }).uri
                  : String(avatarSource)
              }
              source={avatarSource}
              style={styles.avatarImage}
              resizeMode="cover"
              fadeDuration={0}
            />
          </View>
          <View style={styles.profileTextWrapper}>
            <CustomText
              style={styles.profileName}
              numberOfLines={1}
            >
              {name}
            </CustomText>
            <View style={styles.todayBadge}>
              <CustomText style={styles.todayBadgeText}>
                Today: {todaySteps} steps
              </CustomText>
            </View>
          </View>
        </PressableScale>

        <LinearGradient
          colors={[
            "rgba(255, 255, 255, 0.55)",
            "rgba(255, 255, 255, 0.12)",
            "rgba(255, 255, 255, 0.4)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bellGlassBorder}
        >
          <PressableScale
            style={styles.bellInner}
            onPress={onNotificationPress}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <BlurView
              intensity={Platform.OS === "ios" ? 40 : 60}
              tint="dark"
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.glassOverlayDark} />
            <Ionicons
              name="notifications-outline"
              size={22}
              color="#FFFFFF"
              style={styles.bellIcon}
            />
          </PressableScale>
        </LinearGradient>
      </View>

      {!hideRaceCard ? (
        <View style={styles.raceCardContainer}>
          <LinearGradient
            colors={["rgba(55, 0, 255, 0.12)", "rgba(2, 162, 255, 0.12)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <PressableScale style={styles.startRacePressable} onPress={onStartRacePress}>
            <View style={styles.startRaceBannerWrapper}>
              <Image
                source={images.HOME_V2.START_RACE_BANNER}
                style={styles.startRaceBannerBg}
                resizeMode="cover"
              />
              <View style={styles.startRaceContent}>
                <View>
                  <CustomText style={styles.startRaceTitle}>START RACE</CustomText>
                  <CustomText style={styles.startRaceSub}>
                    Click to select opponent
                  </CustomText>
                </View>
                <View style={styles.playIconCircle}>
                  <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />
                </View>
              </View>
            </View>
          </PressableScale>

          {isFirstRace ? (
            <View style={styles.firstRaceInfo}>
              <CustomText style={styles.firstRaceTitle}>
                Race virtually using your phone tracker.
              </CustomText>
              <CustomText style={styles.firstRaceSub}>
                Compete your First Race to see Stats
              </CustomText>
            </View>
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.shadowCol}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowShadowModal(true)}
                  style={styles.shadowButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 16 }}
                  accessibilityRole="button"
                  accessibilityLabel="Step Race Shadow Information"
                >
                  <CustomText style={styles.shadowLabel}>Your Shadow</CustomText>
                  <View style={styles.shadowInfoIcon}>
                    <Ionicons name="information" size={11} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <CustomText style={styles.bestPaceText}>{bestPace}</CustomText>
                <CustomText style={styles.shadowSubtext} numberOfLines={2}>
                  {shadowSubtext}
                </CustomText>
              </View>

              <View style={styles.todayRacesCol}>
                <CustomText style={styles.todayRacesTitle}>Total Races Today</CustomText>
                <View style={styles.racesStatsRow}>
                  <View style={styles.winsCol}>
                    <View style={styles.statScoreRow}>
                      <Image
                        source={images.HOME_V2.ICON_WINS}
                        style={styles.statIcon}
                        resizeMode="contain"
                      />
                      <CustomText style={styles.statCount}>{wins}</CustomText>
                    </View>
                    <CustomText style={styles.statLabel}>Wins</CustomText>
                  </View>
                  <View>
                    <View style={styles.statScoreRow}>
                      <Image
                        source={images.HOME_V2.ICON_LOSE}
                        style={styles.statIcon}
                        resizeMode="contain"
                      />
                      <CustomText style={styles.statCount}>{losses}</CustomText>
                    </View>
                    <CustomText style={styles.statLabel}>Lose</CustomText>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      ) : null}

      {/* ── Step Race Shadow Theme Modal ── */}
      <Modal
        visible={showShadowModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowShadowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0, 0, 0, 0.8)" }]}
            onPress={() => setShowShadowModal(false)}
          />

          <View style={styles.modalContent}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.modalCloseBtn}
              onPress={() => setShowShadowModal(false)}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </PressableScale>

            <View style={styles.modalIconCircle}>
              <Ionicons name="information-circle-outline" size={30} color="#71BAFF" />
            </View>

            <CustomText style={styles.modalTitle}>
              Step Race Shadow
            </CustomText>

            <CustomText style={styles.modalBody}>
              Your steps speed from all past races is combined to create speed for your shadow which
              is your clone that responds to race challenges when you are away
            </CustomText>

            <PressableScale
              style={styles.modalGotItBtn}
              onPress={() => setShowShadowModal(false)}
            >
              <CustomText style={styles.modalGotItText}>Got it</CustomText>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  profilePressable: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  profileTextWrapper: {
    marginLeft: 8,
    minWidth: 0,
  },
  profileName: {
    ...fontTextStyles.headingSmall,
    fontSize: 17,
    lineHeight: 22,
    color: "#FFFFFF",
  },
  todayBadge: {
    marginTop: 2,
    alignSelf: "flex-start",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  todayBadgeText: {
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    lineHeight: 19,
    color: "rgba(0, 0, 0, 0.8)",
  },
  avatarClip: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  avatarImage: {
    width: AVATAR,
    height: AVATAR,
    transform: [{ scale: 1.7 }, { translateY: 12 }],
  },
  bellGlassBorder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 1,
  },
  bellInner: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  glassOverlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 18, 22, 0.72)",
    borderRadius: 24,
  },
  bellIcon: {
    zIndex: 2,
  },
  raceCardContainer: {
    marginTop: 20,
    overflow: "hidden",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(74, 144, 255, 0.35)",
  },
  startRacePressable: {
    width: "100%",
  },
  startRaceBannerWrapper: {
    position: "relative",
    height: 82,
    width: "100%",
    overflow: "hidden",
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  startRaceBannerBg: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    width: "100%",
    opacity: 0.8,
  },
  startRaceContent: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  startRaceTitle: {
    ...fontTextStyles.headingSmall,
    fontSize: 20,
    color: "#FFFFFF",
  },
  startRaceSub: {
    marginTop: 2,
    ...fontTextStyles.bodySmall,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  playIconCircle: {
    marginRight: 4,
    height: 36,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  firstRaceInfo: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  firstRaceTitle: {
    ...fontTextStyles.headingSmall,
    fontSize: 20,
    lineHeight: 26,
    color: "#FFFFFF",
  },
  firstRaceSub: {
    marginTop: 6,
    ...fontTextStyles.bodySmall,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 12,
  },
  shadowCol: {
    flex: 1,
    paddingRight: 8,
  },
  shadowButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  shadowLabel: {
    ...fontTextStyles.bodyMedium,
    fontSize: 14,
    color: "#FFFFFF",
  },
  shadowInfoIcon: {
    marginLeft: 6,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.55)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  bestPaceText: {
    marginTop: 2,
    ...fontTextStyles.headingSmall,
    fontSize: 24,
    color: "#FFFFFF",
  },
  shadowSubtext: {
    marginTop: 2,
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  todayRacesCol: {
    width: 140,
  },
  todayRacesTitle: {
    ...fontTextStyles.bodyMedium,
    fontSize: 14,
    color: "#FFFFFF",
  },
  racesStatsRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  winsCol: {
    marginRight: 20,
  },
  statScoreRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statIcon: {
    marginRight: 4,
    height: 19,
    width: 19,
  },
  statCount: {
    ...fontTextStyles.headingSmall,
    fontSize: 24,
    color: "#FFFFFF",
  },
  statLabel: {
    marginLeft: 24,
    ...fontTextStyles.labelSmall,
    fontSize: 10,
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#061B42",
    padding: 24,
    paddingTop: 20,
    elevation: 8,
  },
  modalCloseBtn: {
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
  modalIconCircle: {
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
  modalTitle: {
    ...fontTextStyles.headingSmall,
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "700",
  },
  modalBody: {
    ...fontTextStyles.bodyText,
    fontSize: 13.5,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalGotItBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#2A80FF",
    elevation: 2,
  },
  modalGotItText: {
    ...fontTextStyles.buttonText,
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

export default memo(HomeRaceHero);
