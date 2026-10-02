import React from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import CustomText from "@/components/CustomText";

interface CheckInCardProps {
  onCheckIn: () => void;
  loading?: boolean;
}

const CheckInCard = ({ onCheckIn, loading = false }: CheckInCardProps) => {
  return (
    <View style={styles.cardSection}>
      <CustomText style={styles.title}>Your Event is Started</CustomText>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.checkInBtn, loading && styles.checkInBtnDisabled]}
        onPress={onCheckIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <CustomText style={styles.checkInBtnText}>Check In</CustomText>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    ...fontTextStyles.twentyTwoNormalBlack,
    color: "#000000",
    flex: 1,
  },
  checkInBtn: {
    backgroundColor: "#000000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 110,
    alignItems: "center",
  },
  checkInBtnDisabled: {
    opacity: 0.7,
  },
  checkInBtnText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
});

export default CheckInCard;
