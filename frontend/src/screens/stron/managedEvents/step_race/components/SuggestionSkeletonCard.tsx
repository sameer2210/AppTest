import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

export const SuggestionSkeletonCard: React.FC = React.memo(() => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Animated.View style={[styles.avatarSkeleton, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.nameSkeleton, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.subtextSkeleton, { opacity: pulseAnim }]} />
      </View>
      <Animated.View style={[styles.buttonSkeleton, { opacity: pulseAnim }]} />
    </View>
  );
});

SuggestionSkeletonCard.displayName = "SuggestionSkeletonCard";

const styles = StyleSheet.create({
  card: {
    width: "31.5%",
    minHeight: 148,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: 10,
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  avatarSkeleton: {
    width: 51,
    height: 51,
    borderRadius: 25.5,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    marginBottom: 6,
  },
  nameSkeleton: {
    width: "70%",
    height: 12,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginTop: 2,
  },
  subtextSkeleton: {
    width: "50%",
    height: 9,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginTop: 4,
  },
  buttonSkeleton: {
    width: 68,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginTop: 8,
  },
});

export default SuggestionSkeletonCard;
