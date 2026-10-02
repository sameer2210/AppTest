import { StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

type Props = {
  message?: string;
  /** Kept for call-site compatibility; refund note is included in the default copy. */
  showRefundNote?: boolean;
};

const DEFAULT_MESSAGE =
  "Event is Cancelled by Organizer, Refund will Settled in 3 to 5 business days";

/** Soft pink alert shown directly under the event hero when cancelled. */
const CancelledEventBanner = ({ message = DEFAULT_MESSAGE }: Props) => (
  <View style={styles.banner}>
    <CustomText style={styles.text}>{message}</CustomText>
  </View>
);

const styles = StyleSheet.create({
  banner: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: "#FFD6D6",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  text: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#000000",
    lineHeight: 20,
  },
});

export default CancelledEventBanner;

