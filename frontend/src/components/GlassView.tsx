import React from "react";
import { View, ViewProps, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

interface GlassViewProps extends ViewProps {
  intensity?: number;
  tint?:
    | "light"
    | "dark"
    | "default"
    | "prominent"
    | "systemUltraThinMaterial"
    | "systemThinMaterial"
    | "systemMaterial"
    | "systemThickMaterial"
    | "systemChromeMaterial";
  className?: string;
}

export const GlassView: React.FC<GlassViewProps> = ({
  intensity = 30,
  tint = "dark",
  className,
  style,
  children,
  ...props
}) => {
  return (
    <View className={`overflow-hidden ${className || ""}`} style={style} {...props}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFillObject} />
      {children}
    </View>
  );
};

export default GlassView;
