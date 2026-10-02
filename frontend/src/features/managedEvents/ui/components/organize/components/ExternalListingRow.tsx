import { StyleSheet, View } from "react-native";
import { fontTextStyles } from "@/utils/typography";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";

type Props = {
  expanded: boolean;
  onToggle: () => void;
};

/** Expand/collapse trigger only — URL field is owned by the parent dock. */
const ExternalListingRow = ({ expanded, onToggle }: Props) => (
  <View style={styles.wrap}>
    <PressableScale
      onPress={onToggle}
      style={styles.header}
      accessibilityRole="button"
      accessibilityLabel="Redirect to Other Platform"
      accessibilityState={{ expanded }}
    >
      <CustomText style={styles.linkText}>Redirect to Other Platform</CustomText>
    </PressableScale>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  linkText: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "rgba(255,255,255,0.6)",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});

export default ExternalListingRow;
