import { StyleSheet, View } from "react-native";
import { fontTextStyles } from "@/utils/typography";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  value?: string;
  onPress: () => void;
  bgStyle?: any;
};

const SuggestionRow = ({ icon, label, subtitle, value, onPress, bgStyle }: Props) => (
  <PressableScale onPress={onPress} style={[styles.row, bgStyle]} accessibilityRole="button">
    <Ionicons name={icon} size={22} color="#FFFFFF" style={styles.icon} />
    <View style={styles.copy}>
      <CustomText style={styles.label} numberOfLines={1}>
        {label}
      </CustomText>
      {value ? (
        <CustomText style={styles.value} numberOfLines={1}>
          {value}
        </CustomText>
      ) : subtitle ? (
        <CustomText style={styles.value} numberOfLines={1}>
          {subtitle}
        </CustomText>
      ) : null}
    </View>
    <Ionicons name="add" size={20} color="#086CFF" />
  </PressableScale>
);

const styles = StyleSheet.create({
  row: {
    height: 60,
    borderRadius: 12,
    backgroundColor: "#191919",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  icon: {
    width: 24,
  },
  copy: {
    flex: 1,
  },
  label: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFFFFF",
  },
  value: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 1,
  },
});

export default SuggestionRow;
