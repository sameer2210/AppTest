import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import CustomText from "@/components/CustomText";
import { DraftTicket } from "./CreateTicketModal";

type Props = {
  ticket: DraftTicket;
};

const TicketCard = ({ ticket }: Props) => {
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(16).stiffness(150)}
      exiting={FadeOut}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <CustomText style={styles.label}>
          {ticket.label || "Standard"}
        </CustomText>
        <CustomText style={styles.price}>
          {ticket.price > 0 ? `₹ ${ticket.price}` : "Free"}
        </CustomText>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.details}>
          <CustomText style={styles.detailText}>
            {ticket.capacity ? `${ticket.capacity} Slots` : "Unlimited Slots"} • {ticket.days} Days
          </CustomText>
          {!!ticket.dailyStepTarget && (
            <CustomText style={styles.detailText}>
              {ticket.dailyStepTarget} steps/day
            </CustomText>
          )}
          {!!ticket.distanceKm && !ticket.dailyStepTarget && (
            <CustomText style={styles.detailText}>
              {ticket.distanceKm} Km target
            </CustomText>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  details: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
    color: "#086CFF",
  },
  detailText: {
    fontSize: 13,
    color: "#A0A0A0",
  },
});

export default TicketCard;
