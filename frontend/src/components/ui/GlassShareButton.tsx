import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { GLASS_BACK_BUTTON_SIZE } from "./GlassBackButton";

type Props = {
  onPress: () => void;
  label?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  height?: number;
};

/** Glass pill share control — matches `GlassBackButton` chrome with visible icon, text, and frosted glass. */
const GlassShareButton = ({
  onPress,
  label = "Share",
  style,
  height = GLASS_BACK_BUTTON_SIZE,
}: Props) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.button,
        { height, borderRadius: height / 2 },
        style,
      ]}
    >
      <BlurView
        intensity={40}
        tint="dark"
        pointerEvents="none"
        style={StyleSheet.absoluteFillObject}
      />
      <View
        pointerEvents="none"
        style={[styles.tint, { borderRadius: height / 2 }]}
      />
      <View style={styles.content}>
        <Ionicons name="share-social-outline" size={17} color="#FFFFFF" />
        <CustomText style={styles.text}>{label}</CustomText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 20, 20, 0.4)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    zIndex: 2,
  },
  text: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 14,
    lineHeight: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

export default React.memo(GlassShareButton);
