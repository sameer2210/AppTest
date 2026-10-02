import { forwardRef } from "react";
import { Platform, ScrollView, type ScrollViewProps } from "react-native";

/** Shared props that keep vertical scrolling smooth across screens. */
export const SCROLL_PERFORMANCE_PROPS = {
  scrollEventThrottle: 16,
  decelerationRate: "normal" as const,
  keyboardShouldPersistTaps: "handled" as const,
  showsVerticalScrollIndicator: false,
  nestedScrollEnabled: true,
  removeClippedSubviews: Platform.OS === "android",
  ...(Platform.OS === "android" ? { overScrollMode: "never" as const } : null),
};

const AppScrollView = forwardRef<ScrollView, ScrollViewProps>(
  (
    { showsVerticalScrollIndicator = false, keyboardShouldPersistTaps = "handled", ...props },
    ref,
  ) => (
    <ScrollView
      ref={ref}
      {...SCROLL_PERFORMANCE_PROPS}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    />
  ),
);

AppScrollView.displayName = "AppScrollView";

export default AppScrollView;
