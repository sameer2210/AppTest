import React from "react";
import { View, ScrollView, TouchableOpacity, StatusBar, StyleSheet } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { SCREEN_HORIZONTAL_PADDING_WIDE, SCREEN_CONTENT_PADDING_BOTTOM } from "@/utils/screen-layout";
import type { PayoutAccountInfo } from "@/types/gym/payout.types";

interface UnverifiedAccountContentProps {
  account: PayoutAccountInfo;
  gymName?: string;
  onGoBack: () => void;
  onEditDetails: () => void;
  onBack: () => void;
}

export const UnverifiedAccountContent: React.FC<UnverifiedAccountContentProps> = ({
  account,
  gymName = "your business",
  onGoBack,
  onEditDetails,
  onBack,
}) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header: Back button */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Failed Badge */}
        <View style={styles.badge}>
          <Ionicons name="close-circle" size={56} color="#FF5151" />
        </View>

        {/* Heading & Subtitle */}
        <CustomText style={styles.heading}>
          Verification Declined
        </CustomText>
        <CustomText style={styles.subtitle}>
          We couldn’t verify your account to receive settlements from {gymName}. Please check your
          account details and try again.
        </CustomText>

        {/* Details Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <CustomText style={styles.rowLabel}>Account holder</CustomText>
            <CustomText style={styles.rowValue}>
              {account.accountHolderName}
            </CustomText>
          </View>

          <View style={styles.cardRow}>
            <CustomText style={styles.rowLabel}>Account number</CustomText>
            <CustomText style={styles.rowValue}>
              {account.maskedAccountNumber}
            </CustomText>
          </View>

          <View style={styles.cardRow}>
            <CustomText style={styles.rowLabel}>IFSC</CustomText>
            <CustomText style={styles.rowValue}>{account.ifsc}</CustomText>
          </View>

          <View style={styles.cardRow}>
            <CustomText style={styles.rowLabel}>Bank</CustomText>
            <CustomText style={styles.rowValue}>{account.bankName}</CustomText>
          </View>

          {/* Divider line */}
          <View style={styles.divider} />

          {/* Status row */}
          <View style={styles.statusRow}>
            <CustomText style={styles.statusLabel}>Status</CustomText>
            <CustomText style={styles.statusValue}>Declined</CustomText>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onGoBack}
          style={styles.goBackButton}
        >
          <CustomText style={styles.goBackButtonText}>Go Back</CustomText>
        </TouchableOpacity>

        {/* Edit Details Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onEditDetails}
          style={styles.editButton}
        >
          <CustomText style={styles.editButtonText}>Edit Details</CustomText>
        </TouchableOpacity>

        {/* Trust Footer */}
        <View style={styles.trustFooter}>
          <Feather name="shield" size={14} color="rgba(255,255,255,0.7)" style={styles.shieldIcon} />
          <CustomText style={styles.trustText}>
            payments secured by <CustomText style={styles.trustBold}>Razorpay</CustomText>
          </CustomText>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050506",
  },
  header: {
    paddingTop: 18,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    alignItems: "center",
    paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM,
  },
  badge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255, 81, 81, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 81, 81, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  card: {
    width: "100%",
    backgroundColor: "#141417",
    borderWidth: 1,
    borderColor: "#272727",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    gap: 14,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    width: "100%",
    marginVertical: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF5151",
  },
  goBackButton: {
    width: "100%",
    height: 60,
    borderRadius: 16,
    backgroundColor: "#2A80FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  goBackButtonText: {
    fontWeight: "600",
    fontSize: 16,
    color: "#FFFFFF",
  },
  editButton: {
    width: "100%",
    height: 60,
    borderRadius: 16,
    backgroundColor: "#2B2B31",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  editButtonText: {
    fontWeight: "600",
    fontSize: 16,
    color: "#FFFFFF",
  },
  trustFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  shieldIcon: {
    marginRight: 6,
  },
  trustText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  trustBold: {
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default UnverifiedAccountContent;
