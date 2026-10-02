import React from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { SCREEN_HORIZONTAL_PADDING_WIDE, SCREEN_CONTENT_PADDING_BOTTOM } from "@/utils/screen-layout";
import type { PayoutAccountInfo } from "@/types/gym/payout.types";

interface VerifyingAccountContentProps {
  account: PayoutAccountInfo;
  isChecking?: boolean;
  onCheckStatus?: () => void;
  onDone?: () => void;
  onBack: () => void;
}

export const VerifyingAccountContent: React.FC<VerifyingAccountContentProps> = ({
  account,
  isChecking = false,
  onCheckStatus,
  onDone,
  onBack,
}) => {
  const bankName = account.bankName || "HDFC Bank";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
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
        {/* Animated Badge */}
        <View style={styles.badge}>
          <LinearGradient
            colors={["#1668FF", "#0A44C8", "#042378", "#021038", "#00061A"]}
            start={{ x: 0.15, y: 0.15 }}
            end={{ x: 0.85, y: 0.85 }}
            style={styles.badgeGradient}
          />
          <View style={styles.badgeBorder} />
          <Ionicons name="shield-checkmark" size={54} color="#FFFFFF" />
        </View>

        {/* Heading */}
        <CustomText style={styles.heading}>
          Verifying your account
        </CustomText>

        {/* Subtitle */}
        <CustomText style={styles.subtitle}>
          We're confirming your bank details with{"\n"}
          {bankName} via a secure penny-drop check. This usually takes a few seconds.
        </CustomText>

        {/* Details Card */}
        <View style={styles.card}>
          {/* Row 1: Account holder */}
          <View style={[styles.cardRow, styles.rowBorder]}>
            <CustomText style={styles.rowLabel}>Account holder</CustomText>
            <CustomText style={styles.rowValue} numberOfLines={1}>
              {account.accountHolderName}
            </CustomText>
          </View>

          {/* Row 2: Account number */}
          <View style={[styles.cardRow, styles.rowBorder]}>
            <CustomText style={styles.rowLabel}>Account number</CustomText>
            <CustomText style={styles.rowValue}>
              {account.maskedAccountNumber}
            </CustomText>
          </View>

          {/* Row 3: IFSC */}
          <View style={[styles.cardRow, styles.rowBorder]}>
            <CustomText style={styles.rowLabel}>IFSC</CustomText>
            <CustomText style={styles.rowValue}>{account.ifsc}</CustomText>
          </View>

          {/* Row 4: Bank */}
          <View style={styles.cardRow}>
            <CustomText style={styles.rowLabel}>Bank</CustomText>
            <CustomText style={styles.rowValue} numberOfLines={1}>
              {account.bankName || "HDFC Bank, Koramangala"}
            </CustomText>
          </View>
        </View>

        {/* Action Buttons */}
        {onCheckStatus && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onCheckStatus}
            disabled={isChecking}
            style={styles.checkStatusButton}
          >
            {isChecking ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <CustomText style={styles.checkStatusButtonText}>Check Status Now</CustomText>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onDone || onBack}
          style={styles.returnButton}
        >
          <CustomText style={styles.returnButtonText}>
            Return to Business Plan
          </CustomText>
        </TouchableOpacity>
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
    width: 124,
    height: 124,
    borderRadius: 62,
    marginTop: 32,
    marginBottom: 28,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  badgeGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 62,
  },
  badgeBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 62,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  heading: {
    fontSize: 24,
    fontWeight: "500",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#141417",
    borderWidth: 1,
    borderColor: "#272727",
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  rowLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  rowValue: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  checkStatusButton: {
    width: "100%",
    maxWidth: 340,
    height: 56,
    borderRadius: 53,
    backgroundColor: "#2A80FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  checkStatusButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  returnButton: {
    width: "100%",
    maxWidth: 340,
    height: 52,
    borderRadius: 53,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  returnButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
  },
});

export default VerifyingAccountContent;
