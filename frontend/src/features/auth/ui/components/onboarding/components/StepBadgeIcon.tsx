import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconSize?: number;
  children?: React.ReactNode;
};

export const StepBadgeIcon = ({
  iconName,
  iconColor = "#FFFFFF",
  iconSize = 34,
  children,
}: Props) => {
  return (
    <Animated.View entering={ZoomIn.duration(350)} style={styles.container}>
      <View style={styles.circle}>
        {children ||
          (iconName ? <Ionicons name={iconName} size={iconSize} color={iconColor} /> : null)}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  circle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
});

