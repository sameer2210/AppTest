import React, { useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import CustomText from "@/components/CustomText";
import { Ionicons } from "@expo/vector-icons";

interface RatingCardProps {
  onSubmit?: (rating: number) => void;
}

const RatingCard = ({ onSubmit }: RatingCardProps) => {
  const [rating, setRating] = useState(0);

  return (
    <View style={styles.cardSection}>
      <CustomText style={styles.subtitle}>You did Amazing</CustomText>
      <CustomText style={styles.title}>Rate your Experience</CustomText>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} activeOpacity={0.7} onPress={() => setRating(star)}>
            <Ionicons
              name="star"
              size={52}
              color={star <= rating ? "#086CFF" : "#E5E5EA"}
              style={styles.starIcon}
            />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
        activeOpacity={0.7}
        onPress={() => onSubmit?.(rating)}
        disabled={rating === 0}
      >
        <CustomText style={styles.submitBtnText}>Submit</CustomText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  subtitle: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#888888",
    marginBottom: 4,
  },
  title: {
    ...fontTextStyles.twentyEightNormalBlack,
    color: "#000000",
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingRight: 20,
  },
  starIcon: {
    // Optional shadow to make the stars pop out more, if needed
  },
  submitBtn: {
    backgroundColor: "#000000",
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 30,
    alignSelf: "flex-end",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFFFFF",
  },
});

export default RatingCard;
