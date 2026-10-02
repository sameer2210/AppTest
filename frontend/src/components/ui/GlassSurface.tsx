import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";
import { cn } from "@/utils/cn";

type Props = ViewProps & {
  className?: string;
  intensity?: number;
  borderRadius?: number;
  /** Thin top-edge shine like iOS liquid glass */
  shine?: boolean;
};

const GlassSurface = ({
  className,
  intensity,
  borderRadius = 58,
  shine = true,
  children,
  style,
  ...props
}: Props) => {
  const blurIntensity = intensity ?? (Platform.OS === "ios" ? 40 : 64);

  return (
    <View className={cn("overflow-hidden", className)} style={[{ borderRadius }, style]} {...props}>
      <BlurView
        pointerEvents="none"
        intensity={blurIntensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint, { borderRadius }]} />
      {shine ? <View pointerEvents="none" style={[styles.shine, { borderRadius }]} /> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  tint: {
    backgroundColor: "rgba(25,25,25,0.22)",
  },
  shine: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderTopColor: "rgba(255,255,255,0.48)",
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  content: {
    zIndex: 2,
    position: "relative",
    width: "100%",
  },
});

export default GlassSurface;
