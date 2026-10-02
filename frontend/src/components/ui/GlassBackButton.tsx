import React from "react";
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  onPress?: () => void;
  /** Pins the button to the top safe area as a transparent overlay. */
  sticky?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
  size?: number;
  iconSize?: number;
};

export const GLASS_BACK_BUTTON_SIZE = 44;

/** Scroll/content top padding when using sticky GlassBackButton. */
export const getGlassBackButtonOffset = (topInset: number) =>
  Math.max(topInset, 0) + 8 + GLASS_BACK_BUTTON_SIZE + 16;

const GlassBackButton = ({
  onPress,
  sticky = false,
  style,
  size = GLASS_BACK_BUTTON_SIZE,
  iconSize = 22,
}: Props) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const button = (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
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
        style={[styles.tint, { borderRadius: size / 2 }]}
      />
      <View style={styles.center}>
        <Ionicons name="chevron-back" size={iconSize} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );

  if (!sticky) {
    return button;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.stickyOverlay,
        { paddingTop: Math.max(insets.top, 12) + 4 },
      ]}
    >
      <View pointerEvents="box-none">{button}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
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
  center: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  stickyOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 999,
    elevation: 999,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
});

export default React.memo(GlassBackButton);
