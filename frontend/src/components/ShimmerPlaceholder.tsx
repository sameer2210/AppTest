import { LinearGradient } from "expo-linear-gradient";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { createShimmerPlaceholder } from "react-native-shimmer-placeholder";

export const SHIMMER_COLORS = ["#1A2940", "#2A3D58", "#1A2940"] as const;

const Shimmer = createShimmerPlaceholder(LinearGradient);

type ShimmerBoxProps = {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export const ShimmerBox = ({ width, height, borderRadius = 8, style }: ShimmerBoxProps) => (
  <Shimmer
    shimmerColors={[...SHIMMER_COLORS]}
    style={[styles.base, { width, height, borderRadius }, style]}
  />
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#1A2940",
  },
});
