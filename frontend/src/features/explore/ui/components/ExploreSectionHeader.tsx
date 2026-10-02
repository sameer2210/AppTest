import React from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import CustomText from "@/components/CustomText";
import { captureEvent } from "@/analytics/posthog/events";

interface ExploreSectionHeaderProps {
  title: string;
  rightLabel?: string;
  onRightPress?: () => void;
  isButton?: boolean;
}

const ExploreSectionHeader = ({
  title,
  rightLabel,
  onRightPress,
  isButton,
}: ExploreSectionHeaderProps) => {
  return (
    <View style={styles.container}>
      <CustomText style={styles.title}>{title}</CustomText>

      {rightLabel && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            captureEvent("featured_see_all_tapped", { section: title });
            onRightPress?.();
          }}
          style={isButton ? styles.pillButton : undefined}
        >
          <CustomText style={isButton ? styles.pillButtonText : styles.linkText}>{rightLabel}</CustomText>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 13,
    marginTop: 28,
    marginBottom: 14,
  },
  title: {
    ...fontTextStyles.twentyEightNormalBlack,
    color: "#FFFFFF",
  },
  linkText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  pillButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  pillButtonText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "#FFFFFF",
  },
});

export default ExploreSectionHeader;
