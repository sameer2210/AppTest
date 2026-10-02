import { type ReactNode } from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
};

/** Insets content below the status bar on edge-to-edge screens. Keep backgrounds outside this wrapper. */
export const ScreenSafeArea = ({ children, style, edges = ["top"] }: Props) => (
  <SafeAreaView edges={[...edges]} style={[{ flex: 1 }, style]}>
    {children}
  </SafeAreaView>
);

export default ScreenSafeArea;
