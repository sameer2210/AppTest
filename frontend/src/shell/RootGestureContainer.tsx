import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { getGestureHandlerRootView } from "../provider/gestureHandlerLazy";

export type RootGestureContainerProps = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

const GestureHandlerRootView = getGestureHandlerRootView();

export const RootGestureContainer: React.FC<RootGestureContainerProps> = GestureHandlerRootView
  ? ({ style, children }) => (
      <GestureHandlerRootView style={style}>{children}</GestureHandlerRootView>
    )
  : ({ style, children }) => <View style={style}>{children}</View>;
