import React from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import CustomText from "@/components/CustomText";

interface EventCompletedCardProps {
  onViewResult?: () => void;
}

const EventCompletedCard = ({ onViewResult }: EventCompletedCardProps) => {
  return (
    <View style={styles.cardSection}>
      <CustomText style={styles.subtitle}>Event Completed</CustomText>
      <CustomText style={styles.title}>You did Amazing</CustomText>

      <TouchableOpacity activeOpacity={0.7} style={styles.viewResultBtn} onPress={onViewResult}>
        <CustomText style={styles.viewResultBtnText}>View Result</CustomText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  subtitle: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#888888",
    marginBottom: 4,
  },
  title: {
    ...fontTextStyles.thirtyFourNormalBlack,
    color: "#000000",
    marginBottom: 20,
  },
  viewResultBtn: {
    backgroundColor: "#000000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignSelf: "flex-start",
  },
  viewResultBtnText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
});

export default EventCompletedCard;
