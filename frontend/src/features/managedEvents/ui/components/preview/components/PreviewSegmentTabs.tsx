import { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { SPRING_IOS } from "@/utils/motion";
import { captureEvent } from "@/analytics/posthog/events";

export type PreviewTab = string;

type Props = {
  tabs: PreviewTab[];
  active: PreviewTab;
  onChange: (tab: PreviewTab) => void;
};

/** Pill segment control — supports 2–3 tabs (Overview/Tickets, Analytics/Overview/Leaderboard). */
const PreviewSegmentTabs = ({ tabs, active, onChange }: Props) => {
  const count = Math.max(tabs.length, 1);
  const rawIndex = tabs.indexOf(active);
  const index = rawIndex < 0 ? 0 : rawIndex;
  const progress = useSharedValue(index);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    progress.value = withSpring(index, SPRING_IOS);
  }, [index, progress]);

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const thumbWidth = Math.max(0, (trackWidth - 8) / count);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * thumbWidth }],
    width: thumbWidth || undefined,
  }));

  return (
    <View style={styles.track} onLayout={onLayout}>
      <Animated.View style={[styles.thumb, thumbStyle]} />
      {tabs.map((tab) => {
        const selected = tab === active;
        return (
          <PressableScale
            key={tab}
            onPress={() => {
              captureEvent("event_detail_tab_switched", { tab });
              onChange(tab);
            }}
            style={styles.slot}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <CustomText
              style={[styles.tabText, { color: selected ? "#090909" : "#D9D9D9" }]}
              numberOfLines={1}
            >
              {tab}
            </CustomText>
          </PressableScale>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 44,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.28)",
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    position: "relative",
  },
  thumb: {
    position: "absolute",
    left: 4,
    height: 36,
    borderRadius: 32,
    backgroundColor: "#D9D9D9",
  },
  slot: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
  },
});

export default PreviewSegmentTabs;
