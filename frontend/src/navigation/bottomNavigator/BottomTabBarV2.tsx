import React, { memo, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { href } from "@/navigation/href";
import type { BottomTabBarComponentProps } from "../bottomTabBarTypes";
import { TAB_KEYS } from "@/constants/stron";

const ICON_SIZE = 24;
const BAR_HEIGHT = 70;
const BAR_RADIUS = 42;
const BAR_H_MARGIN = 13;
/** Active ring diameter — keep in sync with TabSlot ring. */
const ACTIVE_RING_SIZE = 44;
/**
 * Equal inset from the pill edge to the icon ring on all sides
 * (left = right = top = bottom).
 */
const EDGE_INSET = (BAR_HEIGHT - ACTIVE_RING_SIZE) / 2;

type TabIconName = keyof typeof Ionicons.glyphMap;

type SideTab = {
  key: string;
  route: string;
  icon: TabIconName;
  activeIcon: TabIconName;
  label: string;
  size?: number;
};

const TABS: SideTab[] = [
  {
    key: TAB_KEYS.HOME,
    route: TAB_KEYS.HOME,
    icon: "home-outline",
    activeIcon: "home",
    label: "Home",
    size: 24,
  },
  {
    key: "explore",
    route: "explore",
    icon: "compass-outline",
    activeIcon: "compass",
    label: "Explore",
    size: 24,
  },
  {
    key: "activity",
    route: "activity",
    icon: "ticket-outline",
    activeIcon: "ticket",
    label: "Tickets",
    size: 24,
  },
  {
    key: "plan",
    route: "plan",
    icon: "briefcase-outline",
    activeIcon: "briefcase",
    label: "Business",
    size: 24,
  },
];

/**
 * Liquid glass track — blur + light tint only.
 * Never put elevation on this layer (Android BlurView would cover sibling icons).
 */
const GlassBarTrack = memo(() => (
  <View pointerEvents="none" style={styles.barTrack}>
    <BlurView
      intensity={Platform.OS === "ios" ? 75 : 90}
      tint="dark"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    />
    {/* Frost tint — high opacity for a denser glass fill */}
    <View pointerEvents="none" style={styles.glassOverlayDark} />
    <LinearGradient
      colors={["rgba(255, 255, 255, 0.5)", "rgba(255, 255, 255, 0.1)", "rgba(42, 128, 255, 0.35)"]}
      start={{ x: 1, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={styles.glassBorderGradient}
      pointerEvents="none"
    />
    <LinearGradient
      colors={["rgba(255,255,255,0.32)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]}
      locations={[0, 0.4, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.specular}
      pointerEvents="none"
    />
  </View>
));
GlassBarTrack.displayName = "GlassBarTrack";

type TabSlotProps = {
  item: SideTab;
  selected: boolean;
  onPress: (route: string) => void;
};

const TabSlot = memo(({ item, selected, onPress }: TabSlotProps) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={() => onPress(item.route)}
    style={styles.slot}
    hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
    accessibilityRole="button"
    accessibilityLabel={item.label}
    accessibilityState={{ selected }}
  >
    <View style={[styles.iconRing, selected && styles.iconRingActive]}>
      <Ionicons
        name={selected ? item.activeIcon : item.icon}
        size={item.size ?? ICON_SIZE}
        color="#FFFFFF"
        style={{ opacity: selected ? 1 : 0.75 }}
      />
    </View>
  </TouchableOpacity>
));
TabSlot.displayName = "TabSlot";

const BottomTabBarV2 = ({ state, navigation }: BottomTabBarComponentProps) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeName = state.routes[state.index]?.name;

  const navigate = useCallback(
    (route: string) => {
      if (route === "event-rewards") {
        router.push(href.app.eventRewards as never);
        return;
      }
      navigation.navigate(route as never);
    },
    [navigation, router],
  );

  // Create / organize hub is full-screen — hide the floating tab bar.
  if (activeName === "organize-create") {
    return null;
  }

  const sideGap = BAR_H_MARGIN + Math.max(insets.left, insets.right);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.root,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          paddingLeft: sideGap,
          paddingRight: sideGap,
        },
      ]}
    >
      <View style={styles.barShell}>
        <GlassBarTrack />

        {/* Icons must stay ABOVE blur/glass (sibling after track, higher elevation). */}
        <View style={styles.iconRow} collapsable={false}>
          {TABS.map((item) => (
            <TabSlot
              key={item.key}
              item={item}
              selected={activeName === item.route}
              onPress={navigate}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  barShell: {
    height: BAR_HEIGHT,
    position: "relative",
    borderRadius: BAR_RADIUS,
    // Transparent shell — frost comes from BlurView + light tint, not a solid fill.
    // Do NOT use overflow:"hidden" here — on Android it forces child borders into squares.
    backgroundColor: "rgba(18, 22, 38, 0.35)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.42)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
      },
      android: { elevation: 12 },
    }),
  },
  barTrack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BAR_RADIUS,
    overflow: "hidden",
  },
  glassOverlayDark: {
    ...StyleSheet.absoluteFillObject,
    // Dense frost for a more opaque glass bar.
    backgroundColor: Platform.OS === "ios" ? "rgba(18, 22, 38, 0.72)" : "rgba(18, 22, 38, 0.78)",
  },
  glassBorderGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  specular: {
    ...StyleSheet.absoluteFillObject,
  },
  iconRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "center",
    // space-between + equal EDGE_INSET → left/right icons sit same distance
    // from the pill edge as they do from top/bottom.
    justifyContent: "space-between",
    paddingHorizontal: EDGE_INSET,
    zIndex: 20,
    elevation: 20,
  },
  slot: {
    width: ACTIVE_RING_SIZE,
    height: ACTIVE_RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRing: {
    width: ACTIVE_RING_SIZE,
    height: ACTIVE_RING_SIZE,
    borderRadius: ACTIVE_RING_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
  },
  iconRingActive: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
});

export default BottomTabBarV2;
