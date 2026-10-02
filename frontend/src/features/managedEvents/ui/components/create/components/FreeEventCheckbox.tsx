import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";

type Props = {
  checked: boolean;
  onToggle: () => void;
  /** Light text on dark/blue create cards; dark text on white sections. */
  tone?: "light" | "dark";
  label?: string;
};

/** Optional “this event is free” control for create forms. */
const FreeEventCheckbox = ({
  checked,
  onToggle,
  tone = "light",
  label = "This is a FREE event",
}: Props) => {
  const textColor = tone === "light" ? "#D9D9D9" : "#1A1A1A";
  return (
    <PressableScale
      onPress={onToggle}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View style={[styles.box, tone === "dark" && styles.boxDark, checked && styles.boxChecked]}>
        {checked ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
      </View>
      <CustomText style={[styles.label, { color: textColor }]}>
        {label}
      </CustomText>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  boxDark: {
    borderColor: "rgba(0,0,0,0.35)",
  },
  boxChecked: {
    backgroundColor: "#086CFF",
    borderColor: "#086CFF",
  },
  label: {
    flex: 1,
    fontSize: 14,
  },
});

export default FreeEventCheckbox;
