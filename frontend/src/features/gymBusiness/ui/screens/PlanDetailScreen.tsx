import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StatusBar,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import {
  SCREEN_CONTENT_PADDING_TOP,
  SCREEN_HORIZONTAL_PADDING,
  screenContentContainerStyle,
} from "@/utils/screen-layout";
import { useAppDispatch } from "@/store/hooks";
import { fetchMyPurchasedPlanByIdThunk, cancelMembershipThunk } from "@/features/gymBusiness";
import { showToastMessage } from "@/utils/app-utils";
import { href } from "@/navigation/href";
import type { PurchasedPlan } from "@/types/gym/purchasedPlan.types";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { shareListing } from "@/utils/shareListing";
import { sharePlan } from "@/utils/sharePlan";

const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop";
const DEFAULT_AVATAR_IMAGE =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop";

const computeDaysLeft = (plan: PurchasedPlan): number => {
  if (plan.endDate) {
    return Math.max(
      0,
      Math.ceil((new Date(plan.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    );
  }
  if (plan.validityDays != null) return Number(plan.validityDays) || 0;
  return 0;
};

export const PlanDetailScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = typeof params.planId === "string" ? params.planId : "";

  const [plan, setPlan] = useState<PurchasedPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlan = useCallback(async () => {
    if (!planId) {
      setPlan(null);
      setLoading(false);
      showToastMessage("Membership id missing.");
      return;
    }
    setLoading(true);
    const res = await dispatch(fetchMyPurchasedPlanByIdThunk(planId)).unwrap();
    if (!res.success || !res.data) {
      setPlan(null);
      showToastMessage(res.message || "Failed to load plan details.");
    } else {
      setPlan(res.data);
    }
    setLoading(false);
  }, [planId, dispatch]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const handleShare = async () => {
    if (!plan) return;
    if (plan.gym?.id) {
      await shareListing({
        businessId: plan.gym.id,
        businessName: plan.gym.name,
        address: plan.gym.address,
      });
      return;
    }
    if (plan.planId) {
      await sharePlan({
        _id: plan.planId,
        name: plan.planName,
        price: plan.price,
      });
      return;
    }
    showToastMessage("Listing share is unavailable.");
  };

  const handleContactNow = () => {
    if (!plan?.gym.phone) {
      showToastMessage("Contact information not available.");
      return;
    }
    const cleanPhone = plan.gym.phone.replace(/\D/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      showToastMessage(`Phone: ${plan.gym.phone}`);
    });
  };

  const handleMapLink = () => {
    if (!plan) return;
    const query = plan.gym.mapLink || plan.gym.address || plan.gym.name;
    if (!query) {
      showToastMessage("Location not specified.");
      return;
    }
    const url = plan.gym.mapLink
      ? plan.gym.mapLink
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {
      showToastMessage("Could not open maps.");
    });
  };

  const handleCancelPlan = () => {
    if (!plan) return;
    Alert.alert(
      "Cancel Plan",
      `Are you sure you want to cancel your ${plan.planName} at ${plan.gym.name}?`,
      [
        { text: "Keep Plan", style: "cancel" },
        {
          text: "Cancel Membership",
          style: "destructive",
          onPress: async () => {
            const res = await dispatch(cancelMembershipThunk(plan.id)).unwrap();
            if (!res.success) {
              showToastMessage(res.message || "Failed to cancel membership.");
              return;
            }
            showToastMessage(res.message || "Membership cancelled.");
            setPlan((prev) => (prev ? { ...prev, status: "CANCELLED" } : prev));
          },
        },
      ],
    );
  };

  const canCancel = plan?.status === "ACTIVE" || plan?.status === "PENDING";
  const hasPerks = Boolean(plan?.perks && plan.perks.length > 0);
  const hasGymServices = Boolean(plan?.gym.services && plan.gym.services.length > 0);
  const daysLeft = plan ? computeDaysLeft(plan) : 0;
  const openingHours = plan?.gym.openingHours || [];

  return (
    <ScreenSafeArea edges={["top", "bottom"]} style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.content}>
        <View style={styles.header}>
          <PressableScale
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(href.app.myPlans as never);
              }
            }}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </PressableScale>

          <TouchableOpacity onPress={handleShare} activeOpacity={0.7} style={styles.shareButton}>
            <CustomText style={styles.shareText}>Share</CustomText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : !plan ? (
          <View style={styles.centered}>
            <CustomText style={styles.emptyTitle}>Plan not found</CustomText>
            <TouchableOpacity activeOpacity={0.7} onPress={loadPlan} style={styles.retryButton}>
              <CustomText style={styles.retryText}>Retry</CustomText>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={["#1A62FF", "#0C3DBB"]}
              locations={[0, 1]}
              style={styles.heroCard}
            >
              <View style={styles.coverWrap}>
                <Image
                  source={{ uri: plan.gym.coverImage || DEFAULT_COVER_IMAGE }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
                <View style={styles.statusBadge}>
                  <CustomText style={styles.statusBadgeText}>
                    {plan.status === "PENDING"
                      ? "Pending Check-in"
                      : plan.status === "CANCELLED"
                        ? "Cancelled"
                        : plan.status === "EXPIRED"
                          ? "Expired"
                          : "Started"}
                  </CustomText>
                </View>
              </View>

              <CustomText style={styles.heroTitle}>{plan.planName}</CustomText>

              {hasPerks ? (
                <View style={styles.perkRow}>
                  {plan.perks?.map((perk, index) => (
                    <View key={index} style={styles.perkChip}>
                      <CustomText style={styles.perkText}>{perk}</CustomText>
                    </View>
                  ))}
                </View>
              ) : null}
            </LinearGradient>

            <View style={styles.sectionCard}>
              <View style={styles.renewalRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <CustomText style={styles.sectionTitle}>
                    {plan.isFreeTrial ? "Free Trial" : "Renewal"}
                  </CustomText>
                  <CustomText style={styles.mutedText}>
                    ₹{plan.price} • {plan.billingCycle}
                  </CustomText>
                  <CustomText
                    style={[
                      styles.statusLine,
                      canCancel ? styles.statusActive : styles.statusInactive,
                    ]}
                  >
                    {plan.status === "PENDING"
                      ? "Activates on Check-in"
                      : plan.status === "ACTIVE"
                        ? "Renewal Active"
                        : "Inactive"}
                  </CustomText>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <CustomText style={styles.validityLabel}>Validity</CustomText>
                  <CustomText style={styles.validityValue}>
                    {daysLeft > 0 ? `${daysLeft} Days Left` : plan.endDate ? "Ended" : "—"}
                  </CustomText>
                </View>
              </View>

              {canCancel ? (
                <TouchableOpacity
                  onPress={handleCancelPlan}
                  activeOpacity={0.7}
                  style={styles.cancelPlanButton}
                >
                  <CustomText style={styles.cancelPlanText}>Cancel Plan</CustomText>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.gymRow}>
                <View style={styles.gymInfo}>
                  <Image
                    source={{ uri: plan.gym.avatarImage || DEFAULT_AVATAR_IMAGE }}
                    style={styles.gymAvatar}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <CustomText style={styles.gymTitle} numberOfLines={1}>
                      {plan.gym.name}
                    </CustomText>
                    {plan.gym.address ? (
                      <CustomText style={styles.gymAddress} numberOfLines={1}>
                        {plan.gym.address}
                      </CustomText>
                    ) : null}
                    <TouchableOpacity onPress={handleMapLink} activeOpacity={0.7}>
                      <CustomText style={styles.mapLink}>Map Link</CustomText>
                    </TouchableOpacity>
                  </View>
                </View>

                <PressableScale onPress={handleContactNow} style={styles.contactButton}>
                  <CustomText style={styles.contactButtonText}>Contact Now</CustomText>
                </PressableScale>
              </View>

              {hasGymServices ? (
                <View style={styles.serviceRow}>
                  {plan.gym.services?.map((tag, index) => (
                    <View key={index} style={styles.serviceChip}>
                      <CustomText style={styles.serviceText}>{tag}</CustomText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.sectionCard}>
              <CustomText style={[styles.sectionTitle, { marginBottom: 14 }]}>Opening Hours</CustomText>

              {openingHours.length === 0 ? (
                <CustomText style={styles.mutedText}>Hours not available</CustomText>
              ) : (
                <View style={{ gap: 10 }}>
                  {openingHours.map((slot, index) => (
                    <View key={index} style={styles.hoursRow}>
                      <View style={styles.dayBadge}>
                        <CustomText style={styles.dayBadgeText}>{slot.day}</CustomText>
                      </View>

                      {slot.isAvailable ? (
                        <View style={styles.hoursSlots}>
                          <View style={styles.hoursPill}>
                            <CustomText style={styles.hoursText}>{slot.opens || "06:00 AM"}</CustomText>
                          </View>
                          <View style={styles.hoursPill}>
                            <CustomText style={styles.hoursText}>{slot.closes || "10:00 PM"}</CustomText>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.hoursPill, { flex: 1 }]}>
                          <CustomText style={[styles.hoursText, { opacity: 0.5 }]}>Unavailable</CustomText>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenSafeArea>
  );
};

export default PlanDetailScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    paddingTop: SCREEN_CONTENT_PADDING_TOP,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    marginBottom: 16,
    zIndex: 20,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButton: {
    backgroundColor: "rgba(20,20,24,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "#FFFFFF",
  },
  scrollContent: {
    ...screenContentContainerStyle,
    paddingTop: 0,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    color: "#FFFFFF",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "#FFFFFF",
  },
  heroCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  coverWrap: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.5)",
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  statusBadgeText: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "#000000",
  },
  heroTitle: {
    ...headingTextStyles.thirtyExtraBoldBlack,
    color: "#FFFFFF",
    marginTop: 14,
  },
  perkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  perkChip: {
    backgroundColor: "rgba(12,30,74,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  perkText: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "rgba(255,255,255,0.9)",
  },
  sectionCard: {
    backgroundColor: "#141416",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  renewalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  mutedText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  statusLine: {
    ...fontTextStyles.twelveSemiBoldBlack,
    marginTop: 4,
  },
  statusActive: {
    color: "#22C55E",
  },
  statusInactive: {
    color: "#EF4444",
  },
  validityLabel: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "#8E8E93",
  },
  validityValue: {
    ...headingTextStyles.twentyFourExtraBoldBlack,
    color: "#FFFFFF",
    marginTop: 2,
  },
  cancelPlanButton: {
    backgroundColor: "#251414",
    borderWidth: 1,
    borderColor: "rgba(255,77,77,0.6)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelPlanText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "#FF5252",
  },
  gymRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gymInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  gymAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  gymTitle: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  gymAddress: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  mapLink: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "#3882FF",
    marginTop: 2,
  },
  contactButton: {
    backgroundColor: "#1E75FF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  contactButtonText: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "#FFFFFF",
  },
  serviceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  serviceChip: {
    backgroundColor: "#262628",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  serviceText: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "rgba(255,255,255,0.8)",
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1E75FF",
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeText: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "#FFFFFF",
  },
  hoursSlots: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hoursPill: {
    flex: 1,
    backgroundColor: "#232326",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hoursText: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
});
