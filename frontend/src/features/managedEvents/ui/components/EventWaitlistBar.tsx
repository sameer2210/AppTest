import { StyleSheet, View } from "react-native";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";

export type EventWaitlistBarStatus = "closed" | "sold_out";

type Props = {
  status: EventWaitlistBarStatus;
  priceLabel: string;
  onJoinWaitlist?: () => void;
  disabled?: boolean;
  actionLabel?: string;
};

const STATUS_LABEL: Record<EventWaitlistBarStatus, string> = {
  closed: "Registration Closed",
  sold_out: "Sold Out",
};

/** Shared footer for closed / sold-out — status + price + Join Waitlist. */
const EventWaitlistBar = ({
  status,
  priceLabel,
  onJoinWaitlist,
  disabled = false,
  actionLabel = "Join Waitlist",
}: Props) => (
  <View style={styles.container}>
    <View style={styles.textContainer}>
      <CustomText style={styles.statusText}>{STATUS_LABEL[status]}</CustomText>
      <CustomText style={styles.priceText}>{priceLabel}</CustomText>
    </View>
    <PressableScale
      onPress={onJoinWaitlist}
      disabled={disabled}
      style={[
        styles.actionButton,
        disabled && styles.disabledButton,
      ]}
      accessibilityRole="button"
      accessibilityLabel={actionLabel}
    >
      <CustomText style={styles.actionButtonText}>{actionLabel}</CustomText>
    </PressableScale>
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#0A0A0A",
    paddingVertical: 8,
    paddingLeft: 24,
    paddingRight: 8,
  },
  textContainer: {
    marginRight: 12,
    flex: 1,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F5A9A9",
  },
  priceText: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  actionButton: {
    height: 48,
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#086CFF",
    paddingHorizontal: 20,
  },
  disabledButton: {
    opacity: 0.55,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default EventWaitlistBar;
