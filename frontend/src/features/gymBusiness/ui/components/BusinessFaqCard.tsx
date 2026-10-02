import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";

interface BusinessFaqCardProps {
  onPress?: () => void;
}

export const BusinessFaqCard: React.FC<BusinessFaqCardProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.container}
    >
      <CustomText style={styles.title}>FAQs</CustomText>
      <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1C1C1C",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 16,
    color: "#FFFFFF",
  },
});

export default BusinessFaqCard;
