import { useState } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  source: ImageSourcePropType;
  width: number;
  height: number;
  kind?: "medal" | "certificate";
  resizeMode?: "contain" | "cover";
};

const FALLBACK_COLOR = {
  medal: "#F5C542",
  certificate: "#086CFF",
} as const;

/** Network reward art with explicit bounds + icon fallback if the URI 404s. */
const RewardImage = ({
  source,
  width,
  height,
  kind = "medal",
  resizeMode = "contain",
}: Props) => {
  const [failed, setFailed] = useState(false);
  const iconSize = Math.round(Math.min(width, height) * 0.62);

  if (failed) {
    return (
      <View style={[styles.fallback, { width, height }]}>
        <Ionicons
          name={kind === "certificate" ? "ribbon" : "medal"}
          size={iconSize}
          color={FALLBACK_COLOR[kind]}
        />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={{ width, height }}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
};

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default RewardImage;
