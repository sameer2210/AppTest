import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import CustomText from "@/components/CustomText";
import { PressableScale } from "@/components/ui";
import { href } from "@/navigation/href";

interface CreateEventTermsCheckboxProps {
  termsAccepted: boolean;
  onToggle: () => void;
  visible?: boolean;
}

export const CreateEventTermsCheckbox = React.memo(
  ({ termsAccepted, onToggle, visible = true }: CreateEventTermsCheckboxProps) => {
    const router = useRouter();

    if (!visible) return null;

    return (
      <PressableScale
        onPress={onToggle}
        style={styles.container}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: termsAccepted }}
      >
        <View style={styles.boxWrapper}>
          <View
            style={[
              styles.box,
              termsAccepted ? styles.boxChecked : styles.boxUnchecked,
            ]}
          >
            {termsAccepted ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
          </View>
        </View>
        <CustomText style={styles.text}>
          I confirm that I am authorised to organise this event and that all information provided is
          accurate. I agree to STRON's{" "}
          <CustomText
            style={styles.link}
            onPress={() =>
              router.push({
                pathname: href.app.policyWebView,
                params: { policy: "terms-and-conditions" },
              } as never)
            }
          >
            Organiser Terms and Policies.
          </CustomText>
        </CustomText>
      </PressableScale>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 16,
  },
  boxWrapper: {
    marginRight: 12,
    paddingTop: 2,
  },
  box: {
    height: 20,
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
  },
  boxChecked: {
    borderColor: "#086CFF",
    backgroundColor: "#086CFF",
  },
  boxUnchecked: {
    borderColor: "#4A4A4A",
    backgroundColor: "transparent",
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: "#888888",
  },
  link: {
    color: "#086CFF",
  },
});

export default CreateEventTermsCheckbox;
