import { memo } from "react";
import { StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

type Props = {
  isLeading: boolean;
  label?: string;
};

/** Compact Leading / Trailing chip. */
const LiveLeadBadge = ({ isLeading, label }: Props) => {
  const bg = isLeading ? "rgba(45, 228, 65, 0.18)" : "rgba(255, 92, 92, 0.18)";
  const border = isLeading ? "rgba(45, 228, 65, 0.45)" : "rgba(255, 92, 92, 0.45)";
  const color = isLeading ? "#2DE441" : "#FF5C5C";
  const text = label ?? (isLeading ? "LEADING" : "TRAILING");

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: border },
      ]}
    >
      <CustomText style={[styles.text, { color }]}>
        {text}
      </CustomText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  text: {
    ...fontTextStyles.tenSemiBoldBlack,
    letterSpacing: 1.5,
  },
});

export default memo(LiveLeadBadge);

