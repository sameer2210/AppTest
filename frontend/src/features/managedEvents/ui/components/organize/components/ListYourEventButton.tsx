import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";

type Props = {
  onPress: () => void;
};

/** Figma 1423:309 — List on STRON solid card (no glass). */
const ListYourEventButton = ({ onPress }: Props) => (
  <PressableScale
    onPress={onPress}
    style={styles.wrap}
    accessibilityRole="button"
    accessibilityLabel="List on STRON"
  >
    <View style={styles.copy}>
      <CustomText style={styles.title}>List on STRON</CustomText>
      <CustomText style={styles.subtitle}>
        Add your In-person Events, Virtual Events,{"\n"}Workshops, or Training Sessions
      </CustomText>
    </View>
    <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
  </PressableScale>
);

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    minHeight: 90,
    borderRadius: 14,
    backgroundColor: "#191919",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.6)",
  },
});

export default ListYourEventButton;
