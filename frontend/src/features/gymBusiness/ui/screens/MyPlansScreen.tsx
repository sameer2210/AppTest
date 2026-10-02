import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { PressableScale, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { SCREEN_HORIZONTAL_PADDING, SCREEN_CONTENT_PADDING_BOTTOM } from "@/utils/screen-layout";
import { showToastMessage } from "@/utils/app-utils";
import { href } from "@/navigation/href";
import { useAppDispatch } from "@/store/hooks";
import { fetchMyPurchasedPlansThunk, cancelMembershipThunk } from "../../model/gymBusiness.thunks";
import type { PurchasedPlan } from "@/types/gym/purchasedPlan.types";

export type { PurchasedPlan };

type TabType = "All" | "Active" | "Expired";

export const MyPlansScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<TabType>("All");
  const [plans, setPlans] = useState<PurchasedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedGymContact, setSelectedGymContact] = useState<PurchasedPlan["gym"] | null>(null);

  const loadPlans = useCallback(async () => {
    const res = await dispatch(fetchMyPurchasedPlansThunk()).unwrap();
    if (!res.success) {
      setPlans([]);
      setLoadError(res.message || "Failed to load your plans.");
      showToastMessage(res.message || "Failed to load your plans.");
    } else {
      setPlans(res.data);
      setLoadError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPlans();
  }, [loadPlans]);

  const handleCancelPlan = (plan: PurchasedPlan) => {
    Alert.alert(
      "Cancel Plan",
      `Are you sure you want to cancel your ${plan.planName} membership at ${plan.gym.name}?`,
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
            showToastMessage(res.message || "Membership cancelled successfully.");
            setPlans((prev) =>
              prev.map((p) => (p.id === plan.id ? { ...p, status: "CANCELLED" } : p)),
            );
          },
        },
      ],
    );
  };

  const handleRenewPlan = (plan: PurchasedPlan) => {
    if (plan.gym.id) {
      router.push({
        pathname: href.app.explore,
        params: { initialGymId: plan.gym.id },
      } as never);
    } else {
      router.push(href.app.explore as never);
    }
  };

  const handleWhatsAppPress = (phone: string) => {
    if (!phone?.trim()) {
      showToastMessage("Phone number not available.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const url = `whatsapp://send?phone=${formatted}&text=Hi, I am a STRON member with questions about my membership.`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        }
        return Linking.openURL(`https://wa.me/${formatted}`);
      })
      .catch(() => {
        showToastMessage("Could not open WhatsApp.");
      });
  };

  const handleCallPress = (phone: string) => {
    if (!phone?.trim()) {
      showToastMessage("Phone number not available.");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      showToastMessage("Could not initiate call.");
    });
  };

  const handleCopyEmail = async (email: string) => {
    if (!email?.trim()) {
      showToastMessage("Email not available.");
      return;
    }
    try {
      await Clipboard.setStringAsync(email);
      showToastMessage("Email copied to clipboard!");
    } catch {
      showToastMessage(email);
    }
  };

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const isActive = plan.status === "ACTIVE" || plan.status === "PENDING";
      if (selectedTab === "Active" && !isActive) return false;
      if (selectedTab === "Expired" && isActive) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = plan.planName.toLowerCase().includes(query);
        const matchGym = plan.gym.name.toLowerCase().includes(query);
        return matchName || matchGym;
      }
      return true;
    });
  }, [plans, selectedTab, searchQuery]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={["#0055FF", "#08266E", "#030B1C"]}
        locations={[0, 0.35, 0.95]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScreenSafeArea style={styles.screenContent}>
        <View style={styles.header}>
          <PressableScale
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(href.app.tabs as never);
              }
            }}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
          </PressableScale>

          <CustomText style={styles.title}>
            My Plans
          </CustomText>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search my plans"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              style={styles.searchInput}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.tabsRow}>
          {(["All", "Active", "Expired"] as TabType[]).map((tab) => {
            const isSelected = selectedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setSelectedTab(tab)}
                activeOpacity={0.7}
                style={[
                  styles.tabButton,
                  isSelected ? styles.tabButtonSelected : styles.tabButtonUnselected,
                ]}
              >
                <CustomText
                  style={[
                    styles.tabText,
                    isSelected ? styles.tabTextSelected : styles.tabTextUnselected,
                  ]}
                >
                  {tab}
                </CustomText>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <CustomText style={styles.loadingText}>
              Loading your plans...
            </CustomText>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFFFFF"
                colors={["#2563EB"]}
              />
            }
          >
            {filteredPlans.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={54} color="rgba(255, 255, 255, 0.4)" />
                <CustomText style={styles.emptyTitle}>
                  {loadError ? "Couldn’t load plans" : "No plans found"}
                </CustomText>
                <CustomText style={styles.emptySubtitle}>
                  {loadError
                    ? loadError
                    : searchQuery
                      ? "Try adjusting your search query."
                      : selectedTab === "Active"
                        ? "You don't have any active memberships right now."
                        : "Explore gyms & membership plans to get started."}
                </CustomText>
                <PressableScale
                  onPress={() => {
                    if (loadError) {
                      setLoading(true);
                      loadPlans();
                      return;
                    }
                    router.push(href.app.explore as never);
                  }}
                  style={styles.emptyButton}
                >
                  <CustomText style={styles.emptyButtonText}>
                    {loadError ? "Retry" : "Explore Gyms & Plans"}
                  </CustomText>
                </PressableScale>
              </View>
            ) : (
              filteredPlans.map((plan) => {
                const isActive = plan.status === "ACTIVE" || plan.status === "PENDING";
                const priceLabel = `₹${Number(plan.price || 0).toLocaleString("en-IN")} • ${plan.billingCycle || "Monthly"}`;

                return (
                  <PressableScale
                    key={plan.id}
                    onPress={() => {
                      router.push({
                        pathname: href.app.planDetail,
                        params: { planId: plan.id },
                      } as never);
                    }}
                    style={styles.planCard}
                  >
                    <View style={styles.planCardTop}>
                      <CustomText
                        style={styles.planName}
                        numberOfLines={1}
                      >
                        {plan.planName}
                      </CustomText>
                      <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
                    </View>

                    <CustomText style={styles.priceLabel}>{priceLabel}</CustomText>

                    <View style={styles.planCardBottom}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedGymContact(plan.gym);
                        }}
                        activeOpacity={0.7}
                        style={styles.gymBadge}
                      >
                        <View style={styles.whatsappIcon}>
                          <Ionicons name="logo-whatsapp" size={13} color="#FFFFFF" />
                        </View>
                        <CustomText
                          style={styles.gymName}
                          numberOfLines={1}
                        >
                          {plan.gym.name}
                        </CustomText>
                      </TouchableOpacity>

                      {isActive ? (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleCancelPlan(plan);
                          }}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <CustomText style={styles.cancelText}>Cancel</CustomText>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleRenewPlan(plan);
                          }}
                          activeOpacity={0.7}
                          style={styles.renewButton}
                        >
                          <CustomText style={styles.renewText}>Renew</CustomText>
                        </TouchableOpacity>
                      )}
                    </View>
                  </PressableScale>
                );
              })
            )}
          </ScrollView>
        )}
      </ScreenSafeArea>

      <Modal
        visible={Boolean(selectedGymContact)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedGymContact(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedGymContact(null)}
        >
          <View
            style={styles.modalSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.dragHandle} />

            <CustomText style={styles.modalTitle}>Contact Info</CustomText>

            {selectedGymContact && (
              <View style={styles.modalActions}>
                <View style={styles.contactRow}>
                  <CustomText style={styles.contactPhone}>
                    {selectedGymContact.phone || "Not available"}
                  </CustomText>
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      onPress={() => handleWhatsAppPress(selectedGymContact.phone)}
                      activeOpacity={0.7}
                      style={styles.whatsappBtn}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                      <CustomText style={styles.actionBtnText}>Whatsapp</CustomText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleCallPress(selectedGymContact.phone)}
                      activeOpacity={0.7}
                      style={styles.callBtn}
                    >
                      <Ionicons name="call-outline" size={15} color="#FFFFFF" />
                      <CustomText style={styles.actionBtnText}>Call</CustomText>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.contactRow}>
                  <CustomText style={styles.contactEmail} numberOfLines={1}>
                    {selectedGymContact.email || "Not available"}
                  </CustomText>
                  <TouchableOpacity
                    onPress={() => handleCopyEmail(selectedGymContact.email)}
                    activeOpacity={0.7}
                    style={styles.copyBtn}
                  >
                    <CustomText style={styles.actionBtnText}>Copy</CustomText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default MyPlansScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  screenContent: {
    flex: 1,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    marginBottom: 20,
    minHeight: 52,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...headingTextStyles.h1,
    fontSize: 32,
    lineHeight: 42,
    paddingBottom: 4,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "500",
    paddingVertical: 4,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    marginBottom: 16,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonSelected: {
    backgroundColor: "#FFFFFF",
  },
  tabButtonUnselected: {
    backgroundColor: "rgba(37, 37, 40, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  tabText: {
    ...fontTextStyles.buttonText,
    fontSize: 14,
    fontWeight: "700",
  },
  tabTextSelected: {
    color: "#000000",
  },
  tabTextUnselected: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 12,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    ...fontTextStyles.headingSmall,
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    ...fontTextStyles.bodySmall,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 6,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  emptyButtonText: {
    ...fontTextStyles.buttonText,
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  planCard: {
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  planCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planName: {
    ...fontTextStyles.headingSmall,
    flex: 1,
    marginRight: 8,
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  priceLabel: {
    ...fontTextStyles.bodyMedium,
    marginTop: 6,
    marginBottom: 14,
    fontSize: 14,
    color: "#8E8E93",
  },
  planCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gymBadge: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    maxWidth: "68%",
    marginRight: 10,
    backgroundColor: "#2C2C2E",
    borderRadius: 20,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
  },
  whatsappIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  gymName: {
    ...fontTextStyles.bodySmall,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  cancelText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 15,
    fontWeight: "500",
    color: "#FF453A",
  },
  renewButton: {
    backgroundColor: "#2B82F6",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  renewText: {
    ...fontTextStyles.buttonText,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#161618",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  dragHandle: {
    width: 48,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    ...fontTextStyles.headingSmall,
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  modalActions: {
    gap: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactPhone: {
    ...fontTextStyles.bodyMedium,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    flex: 1,
    marginRight: 8,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  whatsappBtn: {
    backgroundColor: "#2A2A2E",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  actionBtnText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 13,
    color: "#FFFFFF",
  },
  callBtn: {
    backgroundColor: "#2A2A2E",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  contactEmail: {
    ...fontTextStyles.bodySmall,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    flex: 1,
    marginRight: 8,
  },
  copyBtn: {
    backgroundColor: "#2A2A2E",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
});
