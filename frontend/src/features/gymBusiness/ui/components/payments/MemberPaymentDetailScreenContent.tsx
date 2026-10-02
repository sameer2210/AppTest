import React, { useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Linking,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenImageBackground } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { screenContentContainerWideStyle, SCREEN_HORIZONTAL_PADDING_WIDE } from "@/utils/screen-layout";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import { MemberPaymentReminderModal } from "./MemberPaymentReminderModal";

import type { MemberPaymentSummary, PaymentItem } from "@/types/gym/payment.types";

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.65)",
  "rgba(8, 55, 140, 0.35)",
  "rgba(4, 12, 26, 0.85)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.28, 0.62, 1] as const;

interface MemberPaymentDetailScreenContentProps {
  member: MemberPaymentSummary;
  payments: PaymentItem[];
  isLoadingPayments: boolean;
  onRecordPaymentPress: () => void;
  onBack: () => void;
}

export const MemberPaymentDetailScreenContent: React.FC<MemberPaymentDetailScreenContentProps> = ({
  member,
  payments,
  isLoadingPayments,
  onRecordPaymentPress,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const [isReminderModalVisible, setIsReminderModalVisible] = useState(false);

  const isFullyPaid = member.totalDue === 0;
  const hasPayments = payments.length > 0;
  const progressRatio =
    member.totalPrice > 0 ? Math.min(1, member.totalPaid / member.totalPrice) : 1;

  const handleCall = () => {
    if (member.phone) {
      Linking.openURL(`tel:${member.phone}`);
    }
  };

  const handleSendReminder = () => {
    setIsReminderModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Screen Background Image */}
      <ScreenImageBackground source={images.HOME_V2.BG} flipY={false} edgeToEdge={true} />

      {/* Full-screen Linear Gradient */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCATIONS}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Header: Circular Back Button */}
      <View style={[styles.headerRow, { paddingTop: topInset + 8 }]}>
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
        {/* 1. Member Profile & Payment Overview Card */}
        <View style={styles.overviewCard}>
          {/* Top Row: Avatar + Info + Time left tag */}
          <View style={styles.cardTopRow}>
            <View style={styles.memberInfoLeft}>
              <View style={styles.avatarCircle}>
                <Image
                  source={getProfileImageSource(
                    member.profileImage,
                    member.memberId || member.memberName,
                  )}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              </View>

              <View style={{ flex: 1 }}>
                <CustomText style={styles.memberNameText} numberOfLines={1}>
                  {member.memberName}
                </CustomText>
                <CustomText style={styles.memberPlanText} numberOfLines={1}>
                  {member.billingCycleText}
                </CustomText>
              </View>
            </View>

            <CustomText style={styles.daysLeftText}>{member.daysLeftText}</CustomText>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.round(progressRatio * 100)}%`,
                  backgroundColor: isFullyPaid ? "#00B14A" : "#DA6C4E",
                },
              ]}
            />
          </View>

          {/* Bottom Row: Paid vs Due */}
          <View style={styles.cardBottomRow}>
            <CustomText style={styles.paidAmountText}>
              ₹{member.totalPaid.toLocaleString("en-IN")} paid of ₹
              {member.totalPrice.toLocaleString("en-IN")}
            </CustomText>

            {isFullyPaid ? (
              <CustomText style={styles.fullyPaidText}>Fully Paid</CustomText>
            ) : (
              <CustomText style={styles.dueAmountText}>
                ₹{member.totalDue.toLocaleString("en-IN")} Due
              </CustomText>
            )}
          </View>

          {/* Overdue Warning Callout */}
          {member.isOverdue && member.totalDue > 0 && (
            <View style={styles.overdueCallout}>
              <View style={styles.overdueHeaderRow}>
                <Ionicons name="warning" size={16} color="#FFB800" />
                <CustomText style={styles.overdueTitle}>
                  {member.overdueDays ? `${member.overdueDays} Days overdue` : "Payment Overdue"}
                </CustomText>
              </View>
              <CustomText style={styles.overdueBody}>
                No payment has been recorded since this plan started. Consider sending a reminder.
              </CustomText>
            </View>
          )}
        </View>

        {/* 2. Call & Reminder Action Buttons */}
        {!isFullyPaid && (
          <View style={styles.contactActionsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCall}
              style={styles.actionPillButton}
            >
              <Ionicons name="call-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <CustomText style={styles.actionPillText}>Call</CustomText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSendReminder}
              style={styles.actionPillButton}
            >
              <Ionicons
                name="paper-plane-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <CustomText style={styles.actionPillText}>Send Reminder</CustomText>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Primary "Record payment" Action Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRecordPaymentPress}
          style={styles.recordPaymentButton}
        >
          <Feather name="credit-card" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <CustomText style={styles.recordPaymentText}>Record payment</CustomText>
        </TouchableOpacity>

        {/* 4. Payment History Title */}
        <CustomText style={styles.sectionTitle}>Payment history</CustomText>

        {/* 5. Payment Ledger List or Empty State */}
        {isLoadingPayments ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#086CFF" />
          </View>
        ) : hasPayments ? (
          <View style={styles.timelineContainer}>
            {/* Vertical timeline line */}
            <View style={styles.timelineVerticalLine} />

            {payments.map((payment, idx) => {
              const paidAmount = payment.finalAmount ?? payment.amount;
              const dateStr = new Date(payment.paidAt || payment.createdAt).toLocaleDateString(
                "en-IN",
                { day: "2-digit", month: "short" },
              );
              const methodText = payment.method
                ? payment.method.charAt(0) + payment.method.slice(1).toLowerCase()
                : "Cash";

              return (
                <View key={payment._id || payment.id || idx} style={styles.timelineItem}>
                  {/* Timeline Dot */}
                  <View style={styles.timelineDot} />

                  {/* Payment Details */}
                  <View style={styles.timelineContentRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <CustomText style={styles.paymentAmountText}>
                        +₹{paidAmount.toLocaleString("en-IN")}
                      </CustomText>
                      <CustomText style={styles.paymentMethodText}>{methodText} Recorded By Gym</CustomText>
                      <CustomText style={styles.paymentNotesText}>
                        {payment.notes || `Transaction ID: ${payment.transactionId || "MANUAL"}`}
                      </CustomText>
                    </View>

                    <CustomText style={styles.paymentDateText}>{dateStr}</CustomText>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Feather name="file-text" size={22} color="rgba(255, 255, 255, 0.7)" />
            </View>
            <CustomText style={styles.emptyTitleText}>No payments recorded yet</CustomText>
            <CustomText style={styles.emptySubtitleText}>
              Once {member.memberName.split(" ")[0]} makes a payment, it'll show up here as a ledger
              entry.
            </CustomText>
          </View>
        )}
      </ScrollView>

      {/* Member Payment Reminder Modal */}
      <MemberPaymentReminderModal
        visible={isReminderModalVisible}
        member={member}
        onClose={() => setIsReminderModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#04060A",
  },
  headerRow: {
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  scrollContent: screenContentContainerWideStyle,
  overviewCard: {
    backgroundColor: "#191919",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  memberInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  memberNameText: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFFFFF",
  },
  memberPlanText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  daysLeftText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  progressBarBg: {
    height: 4,
    width: "100%",
    backgroundColor: "#5D5D5D",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paidAmountText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  fullyPaidText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "#FFFFFF",
  },
  dueAmountText: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#FF5151",
  },
  overdueCallout: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  overdueHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  overdueTitle: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
    marginLeft: 6,
  },
  overdueBody: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  contactActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  actionPillButton: {
    flex: 1,
    height: 52,
    borderRadius: 9,
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "#373737",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  actionPillText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  recordPaymentButton: {
    width: "100%",
    height: 60,
    borderRadius: 6,
    backgroundColor: "#2A80FF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  recordPaymentText: {
    ...fontTextStyles.eighteenMediumBlack,
    color: "#FFFFFF",
  },
  sectionTitle: {
    ...fontTextStyles.eighteenMediumBlack,
    color: "#FFFFFF",
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineContainer: {
    position: "relative",
    paddingLeft: 24,
  },
  timelineVerticalLine: {
    position: "absolute",
    left: 3,
    top: 8,
    bottom: 16,
    width: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  timelineItem: {
    marginBottom: 24,
    position: "relative",
  },
  timelineDot: {
    position: "absolute",
    left: -26,
    top: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#63FF61",
    borderWidth: 1,
    borderColor: "#000000",
  },
  timelineContentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  paymentAmountText: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#63FF61",
  },
  paymentMethodText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "#FFFFFF",
    marginTop: 2,
  },
  paymentNotesText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  paymentDateText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "#FFFFFF",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141414",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#363636",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitleText: {
    ...fontTextStyles.eighteenMediumBlack,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 4,
  },
  emptySubtitleText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
  },
});

export default MemberPaymentDetailScreenContent;
