import React, { useEffect } from "react";
import { StyleSheet, View, type ColorValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Figma 1423:70 explore background (from design screenshot):
 * saturated blue glow at bottom-left → near-black at top-right.
 */
const EXPLORE_GRADIENT = ["#0057D9", "#0049BA", "#00307A", "#0A1A38", "#00040B"];

type GradientDef = {
  id: string;
  colors: string[];
  locations?: number[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

const gradients: GradientDef[] = [
  { id: "home", colors: ["#0F172A", "#000000"] },
  { id: "explore_gyms", colors: ["#2D1B69", "#000000"] },
  { id: "explore_trainers", colors: ["#0D5C63", "#000000"] },
  { id: "explore_tournaments", colors: ["#701A75", "#000000"] },
  {
    id: "explore",
    colors: EXPLORE_GRADIENT,
    locations: [0, 0.22, 0.48, 0.72, 1],
    start: { x: 0.08, y: 1 },
    end: { x: 0.92, y: 0 },
  },
  { id: "activity", colors: ["#0B1528", "#00040B"] },
  { id: "profile", colors: ["#312E81", "#000000"] },
  { id: "kingdom", colors: ["#451A03", "#000000"] },
];

const GradientLayer = ({
  index,
  activeIndex,
  colors,
  locations,
  start = { x: 0, y: 1 },
  end = { x: 1, y: 0 },
}: {
  index: number;
  activeIndex: SharedValue<number>;
  colors: string[];
  locations?: number[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(activeIndex.value === index ? 1 : 0, { duration: 600 }),
    };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]} pointerEvents="none">
      <LinearGradient
        colors={colors as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
        start={start}
        end={end}
        locations={(locations ?? [0.2, 0.75]) as unknown as readonly [number, number, ...number[]]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

const AnimatedTabBackground = () => {
  const pathname = usePathname();
  const activeIndex = useSharedValue(0);

  useEffect(() => {
    let index = 0;
    if (pathname.includes("explore")) index = 4;
    else if (pathname.includes("activity")) index = 5;
    else if (pathname.includes("profile")) index = 6;
    else if (pathname.includes("kingdom")) index = 7;

    activeIndex.value = index;
  }, [pathname, activeIndex]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {gradients.map((grad, i) => (
        <GradientLayer
          key={grad.id}
          index={i}
          activeIndex={activeIndex}
          colors={grad.colors}
          locations={grad.locations}
          start={grad.start}
          end={grad.end}
        />
      ))}
    </View>
  );
};

export default AnimatedTabBackground;
