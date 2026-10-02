import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { DarkDatePickerModal } from "@/components/modals/DarkDatePickerModal";
import { useAppDispatch } from "@/store/hooks";
import { fetchMyActivity } from "@/features/managedEvents";
import {
  fetchBusinessMembershipPlansThunk,
  fetchMemberPaymentSummariesThunk,
} from "../../../model/gymBusiness.thunks";
import type {
  MemberPaymentSummary,
  RecordManualPaymentInput,
  PlanListingOption,
} from "@/types/gym/payment.types";

interface RecordPaymentModalProps {
  visible: boolean;
  member?: MemberPaymentSummary | null;
  members?: MemberPaymentSummary[];
  onClose: () => void;
  onSubmit: (data: RecordManualPaymentInput) => Promise<void>;
  isSubmitting: boolean;
  plans?: PlanListingOption[];
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  visible,
  member,
  members,
  onClose,
  onSubmit,
  isSubmitting,
  plans,
}) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const [selectedMember, setSelectedMember] = useState<MemberPaymentSummary | null>(member ?? null);
  const [internalMembers, setInternalMembers] = useState<MemberPaymentSummary[]>(members ?? []);
  const [memberPickerVisible, setMemberPickerVisible] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const activeMember = selectedMember ?? member ?? null;
  const remainingDue = Math.max(0, Number(activeMember?.totalDue) || 0);
  const defaultAmount = remainingDue > 0 ? String(remainingDue) : "";

  const [amount, setAmount] = useState(defaultAmount);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerFilter, setPickerFilter] = useState<"ALL" | "PLANS" | "LISTINGS">("ALL");

  const [availableOptions, setAvailableOptions] = useState<PlanListingOption[]>(
    plans && plans.length > 0 ? plans : [],
  );
  const [selectedOption, setSelectedOption] = useState<PlanListingOption | null>(
    plans && plans.length > 0 ? plans[0] : null,
  );

  useEffect(() => {
    if (member) {
      setSelectedMember(member);
    } else if (!visible) {
      setSelectedMember(null);
    }
  }, [member, visible]);

  useEffect(() => {
    if (members && members.length > 0) {
      setInternalMembers(members);
    }
  }, [members]);

  useEffect(() => {
    if (visible && !member && internalMembers.length === 0) {
      dispatch(fetchMemberPaymentSummariesThunk())
        .unwrap()
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setInternalMembers(res.data);
          }
        })
        .catch(() => {});
    }
  }, [visible, member, internalMembers.length, dispatch]);

  useEffect(() => {
    if (activeMember) {
      setAmount(activeMember.totalDue > 0 ? String(activeMember.totalDue) : "");

      if (activeMember.planName) {
        setSelectedOption((prev) => {
          const found = availableOptions.find(
            (o) => o.name.toLowerCase() === activeMember.planName.toLowerCase(),
          );
          if (found) return found;
          if (activeMember.activeMembershipId) {
            return {
              id: activeMember.activeMembershipId,
              name: activeMember.planName,
              type: "plan",
              badge: "Plan",
              price: activeMember.totalPrice,
            };
          }
          return prev;
        });
      }
    } else {
      setAmount("");
    }
  }, [activeMember, availableOptions]);

  // Fetch real plans and events on open
  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    const loadOptions = async () => {
      try {
        const [plansRes, activityRes] = await Promise.allSettled([
          dispatch(fetchBusinessMembershipPlansThunk()).unwrap(),
          dispatch(fetchMyActivity()).unwrap(),
        ]);

        const combined: PlanListingOption[] = [];

        // Add Gym Membership Plans
        if (plansRes.status === "fulfilled" && Array.isArray(plansRes.value.data)) {
          for (const p of plansRes.value.data) {
            combined.push({
              id: p._id || p.id,
              name: p.name,
              type: "plan",
              badge: "Plan",
              price: p.finalPrice || p.price,
              billingCycle: p.billingCycle,
            });
          }
        }

        // Add Event Listings
        if (activityRes.status === "fulfilled" && Array.isArray(activityRes.value)) {
          for (const ev of activityRes.value) {
            combined.push({
              id: ev.eventKey || ev.id,
              name: ev.title || "STRON Event",
              type: "listing",
              badge: "Event Listing",
              price: ev.ticketTypes?.[0]?.price || 0,
            });
          }
        }

        if (isMounted) {
          setAvailableOptions(combined);
          setSelectedOption((prev) => {
            if (prev && combined.some((c) => c.id === prev.id && c.name === prev.name)) {
              return prev;
            }
            return combined[0] ?? null;
          });
        }
      } catch {
        if (isMounted) {
          setAvailableOptions(plans && plans.length > 0 ? plans : []);
        }
      }
    };

    void loadOptions();
    return () => {
      isMounted = false;
    };
  }, [dispatch, visible, plans]);

  const numericAmount = Number(amount) || 0;
  const remainingAfterPayment = Math.max(0, remainingDue - numericAmount);

  const isToday = paymentDate.toDateString() === new Date().toDateString();
  const formattedDate = `${isToday ? "Today, " : ""}${paymentDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  const handleSave = useCallback(async () => {
    if (!activeMember) {
      Alert.alert("Select Member", "Please select a member before recording payment.");
      return;
    }
    if (numericAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter an amount greater than zero.");
      return;
    }
    if (!selectedOption) {
      Alert.alert("Select a plan", "Please select a plan or listing before recording payment.");
      return;
    }

    await onSubmit({
      memberId: activeMember.memberId,
      membershipId: activeMember.activeMembershipId || undefined,
      planId: selectedOption.type === "plan" ? selectedOption.id : undefined,
      planName: selectedOption.type === "plan" ? selectedOption.name : undefined,
      eventName: selectedOption.type === "listing" ? selectedOption.name : undefined,
      planOrListingName: selectedOption.name,
      amount: numericAmount,
      finalAmount: numericAmount,
      method: paymentMode,
      notes: `Payment for ${selectedOption.name} via ${paymentMode}`,
      paidAt: paymentDate.toISOString(),
    });
  }, [activeMember, numericAmount, selectedOption, paymentMode, paymentDate, onSubmit]);

  if (!visible) return null;

  const filteredMembersList = internalMembers.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase().trim();
    const nameMatch = m.memberName ? m.memberName.toLowerCase().includes(q) : false;
    const phoneMatch = m.phone ? m.phone.includes(q) : false;
    return nameMatch || phoneMatch;
  });

  const filteredOptions = availableOptions.filter((opt) => {
    if (pickerFilter === "PLANS" && opt.type !== "plan") return false;
    if (pickerFilter === "LISTINGS" && opt.type !== "listing") return false;
    if (pickerSearch.trim()) {
      return opt.name.toLowerCase().includes(pickerSearch.toLowerCase().trim());
    }
    return true;
  });

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
              >
                {/* Close Bar / Header */}
                <View style={styles.sheetHeader}>
                  <View style={styles.headerSpacer} />
                  <CustomText
                    style={[headingTextStyles.size24BoldBlack, styles.headerTitle]}
                  >
                    Received Payment
                  </CustomText>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onClose}
                    style={styles.closeButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Subtitle: Rohan Sharma. ₹1500 remaining OR Record payment for member */}
                <CustomText
                  style={[fontTextStyles.sixteenNormalBlack, styles.sheetSubtitle]}
                >
                  {activeMember
                    ? `${activeMember.memberName}. ₹${remainingDue.toLocaleString("en-IN")} remaining`
                    : "Record payment for member"}
                </CustomText>

                {/* Huge Amount Input */}
                <View style={styles.amountRow}>
                  <CustomText
                    style={[fontTextStyles.size30SemiBoldBlack, styles.currencySymbol]}
                  >
                    ₹
                  </CustomText>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    keyboardType="numeric"
                    style={styles.amountInput}
                  />
                </View>

                {/* Field: Select Member Dropdown */}
                <CustomText
                  style={[fontTextStyles.sixteenMediumBlack, styles.fieldLabel]}
                >
                  Select Member
                </CustomText>
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={!!member && internalMembers.length <= 1}
                  onPress={() => {
                    setMemberSearch("");
                    setMemberPickerVisible(true);
                  }}
                  style={styles.dropdownButton}
                >
                  <CustomText
                    style={[
                      fontTextStyles.sixteenMediumBlack,
                      styles.dropdownText,
                      !activeMember && styles.dropdownPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {activeMember ? activeMember.memberName : "Choose Member"}
                  </CustomText>
                  <Ionicons name="chevron-down" size={18} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Field: Select Plan/listing Dropdown */}
                <CustomText
                  style={[fontTextStyles.sixteenMediumBlack, styles.fieldLabel]}
                >
                  Select Plan/listing
                </CustomText>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setPickerSearch("");
                    setPickerModalVisible(true);
                  }}
                  style={styles.dropdownButton}
                >
                  <CustomText
                    style={[
                      fontTextStyles.sixteenMediumBlack,
                      styles.dropdownText,
                      !selectedOption && styles.dropdownPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedOption?.name || "Select a plan or listing"}
                  </CustomText>
                  <Ionicons name="chevron-down" size={18} color="#FFFFFF" />
                </TouchableOpacity>

                {/* Field: Payment Date */}
                <CustomText
                  style={[fontTextStyles.sixteenMediumBlack, styles.fieldLabel]}
                >
                  Payment Date
                </CustomText>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setDatePickerVisible(true)}
                  style={styles.dropdownButton}
                >
                  <CustomText style={[fontTextStyles.sixteenNormalBlack, styles.dateText]}>
                    {formattedDate}
                  </CustomText>
                  <Ionicons name="calendar-outline" size={18} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>

                {/* Field: Payment Mode */}
                <CustomText
                  style={[fontTextStyles.sixteenMediumBlack, styles.fieldLabel]}
                >
                  Payment Mode
                </CustomText>
                <View style={styles.modeRow}>
                  {(["CASH", "UPI", "CARD"] as const).map((mode) => {
                    const isSelected = paymentMode === mode;
                    const label = mode === "CASH" ? "Cash" : mode === "UPI" ? "UPI" : "Card";
                    return (
                      <TouchableOpacity
                        key={mode}
                        activeOpacity={0.7}
                        onPress={() => setPaymentMode(mode)}
                        style={[
                          styles.modeOption,
                          isSelected ? styles.modeOptionActive : styles.modeOptionInactive,
                        ]}
                      >
                        <CustomText
                          style={[
                            isSelected ? fontTextStyles.sixteenSemiBoldBlack : fontTextStyles.sixteenNormalBlack,
                            isSelected ? styles.modeTextActive : styles.modeTextInactive,
                          ]}
                        >
                          {label}
                        </CustomText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Remaining calculation */}
                <View style={styles.calcContainer}>
                  <CustomText style={[fontTextStyles.sixteenNormalBlack, styles.calcText]}>
                    Remaining After this Payment{" "}
                    <CustomText style={[fontTextStyles.fifteenBoldBlack, styles.calcAmount]}>
                      ₹{remainingAfterPayment.toLocaleString("en-IN")}
                    </CustomText>
                  </CustomText>
                </View>

                {/* Save Payment Action Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleSave}
                  disabled={isSubmitting}
                  style={styles.saveButton}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <CustomText style={[fontTextStyles.eighteenSemiBoldBlack, styles.saveButtonText]}>
                      Save Payment
                    </CustomText>
                  )}
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Plan / Listing Picker Bottom Sheet Modal */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setPickerModalVisible(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerContainer}>
                {/* Header */}
                <View style={styles.pickerHeader}>
                  <CustomText style={[headingTextStyles.twentyTwoBoldBlack, styles.pickerTitle]}>
                    Select Plan or Event Listing
                  </CustomText>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setPickerModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Filter Tabs */}
                <View style={styles.pickerTabsRow}>
                  {(
                    [
                      { key: "ALL", label: "All" },
                      { key: "PLANS", label: "Membership Plans" },
                      { key: "LISTINGS", label: "Event Listings" },
                    ] as const
                  ).map((tab) => {
                    const isTabActive = pickerFilter === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        activeOpacity={0.7}
                        onPress={() => setPickerFilter(tab.key)}
                        style={[
                          styles.pickerTabButton,
                          isTabActive ? styles.pickerTabActive : styles.pickerTabInactive,
                        ]}
                      >
                        <CustomText
                          style={[
                            isTabActive ? fontTextStyles.twelveSemiBoldBlack : fontTextStyles.twelveNormalBlack,
                            isTabActive ? styles.pickerTabTextActive : styles.pickerTabTextInactive,
                          ]}
                        >
                          {tab.label}
                        </CustomText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Search Box */}
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={16} color="rgba(255, 255, 255, 0.4)" />
                  <TextInput
                    value={pickerSearch}
                    onChangeText={setPickerSearch}
                    placeholder="Search plans or event listings..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    style={styles.searchInput}
                  />
                  {pickerSearch.length > 0 && (
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setPickerSearch("")}>
                      <Ionicons name="close-circle" size={16} color="rgba(255, 255, 255, 0.5)" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Options List */}
                <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
                  {filteredOptions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <CustomText style={[fontTextStyles.sixteenNormalBlack, styles.emptyText]}>
                        No plans or listings found
                      </CustomText>
                    </View>
                  ) : (
                    filteredOptions.map((opt) => {
                      const isSelected =
                        selectedOption?.id === opt.id && selectedOption?.name === opt.name;
                      const isPlan = opt.type === "plan";
                      return (
                        <TouchableOpacity
                          key={`${opt.type}-${opt.id}-${opt.name}`}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedOption(opt);
                            if (typeof opt.price === "number" && opt.price > 0) {
                              setAmount(String(opt.price));
                            }
                            setPickerModalVisible(false);
                          }}
                          style={[
                            styles.optionRow,
                            isSelected ? styles.optionRowSelected : styles.optionRowUnselected,
                          ]}
                        >
                          <View style={styles.optionIconContainer}>
                            <Ionicons
                              name={isPlan ? "barbell" : "trophy"}
                              size={18}
                              color={isPlan ? "#0074FF" : "#FF9F0A"}
                            />
                          </View>

                          <View style={styles.optionContent}>
                            <CustomText
                              style={[fontTextStyles.fifteenSemiBoldBlack, styles.optionTitle]}
                              numberOfLines={1}
                            >
                              {opt.name}
                            </CustomText>
                            <View style={styles.optionMetaRow}>
                              <View
                                style={[
                                  styles.optionBadge,
                                  isPlan ? styles.optionBadgePlan : styles.optionBadgeListing,
                                ]}
                              >
                                <CustomText style={[fontTextStyles.tenBoldBlack, styles.optionBadgeText]}>
                                  {opt.badge || (isPlan ? "Membership Plan" : "Event Listing")}
                                </CustomText>
                              </View>
                              {typeof opt.price === "number" && opt.price > 0 && (
                                <CustomText style={[fontTextStyles.twelveNormalBlack, styles.optionPriceText]}>
                                  ₹{opt.price.toLocaleString("en-IN")}
                                </CustomText>
                              )}
                            </View>
                          </View>

                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={22} color="#0074FF" />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Member Picker Bottom Sheet Modal */}
      <Modal
        visible={memberPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMemberPickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMemberPickerVisible(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.pickerContainer}>
                {/* Header */}
                <View style={styles.pickerHeader}>
                  <CustomText style={[headingTextStyles.twentyTwoBoldBlack, styles.pickerTitle]}>
                    Select Member
                  </CustomText>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setMemberPickerVisible(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Search Box */}
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={16} color="rgba(255, 255, 255, 0.4)" />
                  <TextInput
                    value={memberSearch}
                    onChangeText={setMemberSearch}
                    placeholder="Search member by name or phone..."
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    style={styles.searchInput}
                  />
                  {memberSearch.length > 0 && (
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setMemberSearch("")}>
                      <Ionicons name="close-circle" size={16} color="rgba(255, 255, 255, 0.5)" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Member List */}
                <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
                  {filteredMembersList.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <CustomText style={[fontTextStyles.sixteenNormalBlack, styles.emptyText]}>
                        No members found
                      </CustomText>
                    </View>
                  ) : (
                    filteredMembersList.map((m) => {
                      const isSelected = activeMember?.memberId === m.memberId;
                      const isPaid = m.totalDue === 0;
                      return (
                        <TouchableOpacity
                          key={m.memberId}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedMember(m);
                            if (m.totalDue > 0) {
                              setAmount(String(m.totalDue));
                            }
                            setMemberPickerVisible(false);
                          }}
                          style={[
                            styles.optionRow,
                            isSelected ? styles.optionRowSelected : styles.optionRowUnselected,
                          ]}
                        >
                          <View style={styles.avatarCircleSmall}>
                            {m.profileImage ? (
                              <Image
                                source={{ uri: m.profileImage }}
                                style={styles.avatarImageSmall}
                                resizeMode="cover"
                              />
                            ) : (
                              <Ionicons name="person" size={16} color="rgba(255, 255, 255, 0.7)" />
                            )}
                          </View>

                          <View style={styles.optionContent}>
                            <CustomText
                              style={[fontTextStyles.fifteenSemiBoldBlack, styles.optionTitle]}
                              numberOfLines={1}
                            >
                              {m.memberName}
                            </CustomText>
                            <View style={styles.optionMetaRow}>
                              <CustomText style={[fontTextStyles.twelveNormalBlack, styles.optionPriceText]}>
                                {m.billingCycleText || m.phone || "Member"}
                              </CustomText>
                              <CustomText
                                style={[
                                  fontTextStyles.twelveSemiBoldBlack,
                                  isPaid ? styles.memberPaidText : styles.memberDueText,
                                ]}
                              >
                                {isPaid ? "Fully Paid" : `₹${m.totalDue.toLocaleString("en-IN")} Due`}
                              </CustomText>
                            </View>
                          </View>

                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={22} color="#0074FF" />
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Dark Date Picker Modal */}
      <DarkDatePickerModal
        visible={datePickerVisible}
        title="Select Payment Date"
        initialDate={paymentDate}
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(date) => {
          setPaymentDate(date);
          setDatePickerVisible(false);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#16181D",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerSpacer: {
    width: 32,
  },
  headerTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    paddingVertical: 4,
  },
  currencySymbol: {
    color: "#0074FF",
    marginRight: 6,
    marginTop: -4,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    minWidth: 100,
    padding: 0,
  },
  fieldLabel: {
    color: "#FFFFFF",
    marginBottom: 8,
  },
  dropdownButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dropdownText: {
    color: "#FFFFFF",
    flex: 1,
    marginRight: 8,
  },
  dropdownPlaceholder: {
    color: "rgba(255, 255, 255, 0.4)",
  },
  dateText: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  modeOption: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modeOptionActive: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  modeOptionInactive: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modeTextActive: {
    color: "#FFFFFF",
  },
  modeTextInactive: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  calcContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  calcText: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  calcAmount: {
    color: "#FF453A",
  },
  saveButton: {
    width: "100%",
    height: 54,
    borderRadius: 12,
    backgroundColor: "#0074FF",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  pickerContainer: {
    backgroundColor: "#1A1D24",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    maxHeight: "80%",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pickerTitle: {
    color: "#FFFFFF",
  },
  pickerTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  pickerTabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  pickerTabActive: {
    backgroundColor: "#0074FF",
  },
  pickerTabInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  pickerTabTextActive: {
    color: "#FFFFFF",
  },
  pickerTabTextInactive: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  searchBox: {
    height: 40,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#FFFFFF",
    paddingVertical: 0,
  },
  optionsList: {
    maxHeight: 320,
  },
  emptyContainer: {
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  optionRowSelected: {
    backgroundColor: "rgba(0, 116, 255, 0.15)",
    borderColor: "#0074FF",
  },
  optionRowUnselected: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
    marginRight: 8,
  },
  optionTitle: {
    color: "#FFFFFF",
    marginBottom: 2,
  },
  optionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionBadgePlan: {
    backgroundColor: "rgba(0, 116, 255, 0.2)",
  },
  optionBadgeListing: {
    backgroundColor: "rgba(255, 159, 10, 0.2)",
  },
  optionBadgeText: {
    color: "#FFFFFF",
  },
  optionPriceText: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  avatarCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  avatarImageSmall: {
    width: "100%",
    height: "100%",
  },
  memberPaidText: {
    color: "#63FF61",
    marginLeft: 8,
  },
  memberDueText: {
    color: "#FF5151",
    marginLeft: 8,
  },
});

export default RecordPaymentModal;
