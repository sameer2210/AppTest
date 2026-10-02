import { memo } from "react";
import { Image, Platform, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { images } from "@/utils/images";
import { captureEvent } from "@/analytics/posthog/events";

type Props = {
  onCheckIn: () => void;
  onRaces: () => void;
  onPlans: () => void;
  racesBadge?: boolean;
};

type Action = {
  label: string;
  icon: ImageSourcePropType;
  onPress: () => void;
  badge: boolean;
};

/** Liquid glass circle — icon layer must sit above BlurView (Android elevation). */
const GlassActionOrb = ({ icon, badge }: { icon: ImageSourcePropType; badge: boolean }) => (
  <LinearGradient
    colors={["rgba(255, 255, 255, 0.55)", "rgba(255, 255, 255, 0.12)", "rgba(255, 255, 255, 0.4)"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.glassBorder}
  >
    <View style={styles.orbInner}>
      <View pointerEvents="none" style={styles.glassTrack}>
        <BlurView
          intensity={Platform.OS === "ios" ? 40 : 60}
          tint="dark"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.glassOverlayDark} />
      </View>
      <Image source={icon} style={styles.orbIcon} resizeMode="contain" />
      {badge ? <View style={styles.badge} /> : null}
    </View>
  </LinearGradient>
);

const HomeQuickActions = ({ onCheckIn, onRaces, onPlans, racesBadge = false }: Props) => {
  const actions: Action[] = [
    { label: "Smart QR", icon: images.HOME_V2.ICON_CHECKIN, onPress: onCheckIn, badge: false },
    {
      label: "My Races",
      icon: images.HOME_V2.ICON_MY_RACES,
      onPress: onRaces,
      badge: racesBadge,
    },
    { label: "My Plans", icon: images.HOME_V2.ICON_MY_PLANS, onPress: onPlans, badge: false },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <PressableScale
          key={action.label}
          style={styles.actionItem}
          onPress={() => {
            captureEvent("home_quick_action_tapped", { action: action.label });
            action.onPress();
          }}
        >
          <GlassActionOrb icon={action.icon} badge={action.badge} />
          <CustomText style={styles.actionLabel}>{action.label}</CustomText>
        </PressableScale>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  actionItem: {
    alignItems: "center",
  },
  actionLabel: {
    ...fontTextStyles.bodyText,
    marginTop: 8,
    fontSize: 16,
    color: "#FFFFFF",
  },
  glassBorder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    padding: 1.5,
  },
  orbInner: {
    flex: 1,
    borderRadius: 34,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glassTrack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    overflow: "hidden",
  },
  glassOverlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 18, 22, 0.72)",
    borderRadius: 34,
  },
  orbIcon: {
    zIndex: 20,
    elevation: 20,
    width: 40,
    height: 40,
  },
  badge: {
    position: "absolute",
    right: 12,
    top: 10,
    zIndex: 3,
    height: 10,
    width: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(18,18,22,0.9)",
    backgroundColor: "#FF3B30",
  },
});

export default memo(HomeQuickActions);
