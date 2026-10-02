import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

type Props = {
  activeStepIndex: number;
  totalSteps?: number;
};

export const PaginationDots = ({ activeStepIndex, totalSteps = 4 }: Props) => {
  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(200)}
      style={styles.container}
    >
      {Array.from({ length: totalSteps }).map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.dot,
            idx === activeStepIndex ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#2B82FF",
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
});

