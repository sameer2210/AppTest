import { StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

type Props = {
  priceLabel: string;
  /** Optional secondary line, e.g. "Entry ticket". */
  subtitle?: string;
};

/** Compact entry-price strip for Face Off / KotH organizer & participant surfaces. */
const EntryPriceCard = ({ priceLabel, subtitle = "Entry ticket" }: Props) => (
  <View style={styles.card}>
    <View style={styles.copy}>
      <CustomText style={styles.label}>Ticket price</CustomText>
      {subtitle ? (
        <CustomText style={styles.subtitle}>{subtitle}</CustomText>
      ) : null}
    </View>
    <CustomText style={styles.price}>{priceLabel}</CustomText>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#191919",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  copy: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.55)",
  },
  subtitle: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 4,
  },
  price: {
    ...fontTextStyles.size24MediumBlack,
    color: "#FFFFFF",
  },
});

export default EntryPriceCard;
