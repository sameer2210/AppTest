import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { ScreenImageBackground } from "@/components/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { screenContentContainerWideStyle, SCREEN_HORIZONTAL_PADDING_WIDE } from "@/utils/screen-layout";
import ConfirmationModal from "@/components/confirmation/ConfirmationModal";
import { useAppDispatch } from "@/store/hooks";
import { listGymPlans } from "@/features/gymBusiness";
import type {
  PlanBillingCycle,
  CreatePlanInput,
  UpdatePlanInput,
  MembershipPlan,
} from "@/types/gym/plan.types";

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.65)",
  "rgba(8, 55, 140, 0.35)",
  "rgba(4, 12, 26, 0.85)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.28, 0.62, 1] as const;

interface CreatePlanScreenContentProps {
  initialPlan?: MembershipPlan | null;
  isLoadingPlan?: boolean;
  isSubmitting: boolean;
  isStopping?: boolean;
  isDeleting?: boolean;
  onSubmit: (planInput: CreatePlanInput) => void;
  onUpdate?: (planInput: UpdatePlanInput) => void;
  onStopPlan?: () => void;
  onDelete?: () => void;
  onBack: () => void;
}

export const CreatePlanScreenContent: React.FC<CreatePlanScreenContentProps> = ({
  initialPlan,
  isLoadingPlan = false,
  isSubmitting,
  isStopping = false,
  isDeleting = false,
  onSubmit,
  onUpdate,
  onStopPlan,
  onDelete,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  const isEditMode = Boolean(initialPlan && (initialPlan._id || initialPlan.id));
  const isPlanStopped = initialPlan?.status === "STOPPED";

  const [planName, setPlanName] = useState("");
  const [price, setPrice] = useState("");
  const [isFreeTrial, setIsFreeTrial] = useState(false);
  const [trialDurationDays, setTrialDurationDays] = useState("7");
  const [convertToPlanId, setConvertToPlanId] = useState<string | null>(null);
  const [paidPlans, setPaidPlans] = useState<MembershipPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<PlanBillingCycle>("MONTHLY");
  const [perks, setPerks] = useState<string[]>([
    "Unlimited Access",
    "2 Personal Training Sessions",
    "Group classes included",
  ]);
  const [newPerkInput, setNewPerkInput] = useState("");
  const [showAddPerkInput, setShowAddPerkInput] = useState(false);

  const [stopModalVisible, setStopModalVisible] = useState(false);

  useEffect(() => {
    if (initialPlan) {
      setPlanName(initialPlan.name || "");
      setPrice(initialPlan.price ? String(initialPlan.price) : "0");
      setIsFreeTrial(Boolean(initialPlan.isFreeTrial));
      setConvertToPlanId(initialPlan.convertToPlanId ? String(initialPlan.convertToPlanId) : null);
      if (initialPlan.trialDuration) {
        setTrialDurationDays(String(initialPlan.trialDuration));
      } else if (initialPlan.duration && initialPlan.durationUnit === "DAYS") {
        setTrialDurationDays(String(initialPlan.duration));
      }
      if (initialPlan.billingCycle && initialPlan.billingCycle !== "ONE_TIME") {
        setBillingCycle(initialPlan.billingCycle);
      }
      if (Array.isArray(initialPlan.perks) && initialPlan.perks.length > 0) {
        setPerks(initialPlan.perks);
      }
    }
  }, [initialPlan]);

  const dispatch = useAppDispatch();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await dispatch(listGymPlans("ACTIVE")).unwrap();
      if (cancelled || !res.success) return;
      const currentId = String(initialPlan?._id || initialPlan?.id || "");
      setPaidPlans(
        (res.data || []).filter((plan: MembershipPlan) => {
          const id = String(plan._id || plan.id || "");
          return !plan.isFreeTrial && Number(plan.price) > 0 && id !== currentId;
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [initialPlan, dispatch]);

  const billingOptions: { key: PlanBillingCycle; label: string }[] = [
    { key: "MONTHLY", label: "Monthly" },
    { key: "QUARTERLY", label: "Quarterly" },
    { key: "YEARLY", label: "Yearly" },
  ];

  const handleRemovePerk = (index: number) => {
    setPerks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddPerk = () => {
    const trimmed = newPerkInput.trim();
    if (!trimmed) return;
    setPerks((prev) => [...prev, trimmed]);
    setNewPerkInput("");
    setShowAddPerkInput(false);
  };

  const handleSave = () => {
    if (!planName.trim()) {
      Alert.alert("Required Field", "Please enter a plan name.");
      return;
    }

    if (!isFreeTrial && (!price.trim() || Number(price) <= 0)) {
      Alert.alert("Required Field", "Please enter a valid price for the paid plan.");
      return;
    }

    if (isFreeTrial && (!trialDurationDays.trim() || Number(trialDurationDays) <= 0)) {
      Alert.alert("Required Field", "Please enter a valid trial duration in days.");
      return;
    }

    let duration = 1;
    let durationUnit: "DAYS" | "MONTHS" | "YEARS" = "MONTHS";

    if (isFreeTrial) {
      duration = Number(trialDurationDays) || 7;
      durationUnit = "DAYS";
    } else if (billingCycle === "MONTHLY") {
      duration = 1;
      durationUnit = "MONTHS";
    } else if (billingCycle === "QUARTERLY") {
      duration = 3;
      durationUnit = "MONTHS";
    } else if (billingCycle === "YEARLY") {
      duration = 1;
      durationUnit = "YEARS";
    }

    const payload: CreatePlanInput = {
      name: planName.trim(),
      price: isFreeTrial ? 0 : Number(price),
      currency: "INR",
      billingCycle: isFreeTrial ? "ONE_TIME" : billingCycle,
      duration,
      durationUnit,
      isFreeTrial,
      trialDuration: isFreeTrial ? Number(trialDurationDays) || 7 : 0,
      convertToPlanId: isFreeTrial ? convertToPlanId || null : null,
      perks,
      status: initialPlan?.status || "ACTIVE",
    };

    if (isEditMode && onUpdate) {
      onUpdate(payload);
    } else {
      onSubmit(payload);
    }
  };

  const handleStopPress = () => {
    setStopModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScreenImageBackground source={images.HOME_V2.BG} flipY edgeToEdge={true} />

      <View style={styles.absoluteGlow} pointerEvents="none">
        <LinearGradient
          colors={GRADIENT_COLORS}
          locations={GRADIENT_LOCATIONS}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.flexOne}
        />
      </View>

      <View style={styles.flexOne}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flexOne}
        >
          <View style={[styles.topHeaderRow, { paddingTop: topInset + 8 }]}>
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

            <CustomText style={styles.headerTitle}>
              {isEditMode ? "Edit Plan" : "Create Plan"}
            </CustomText>
          </View>

          {isLoadingPlan ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2A80FF" />
              <CustomText style={styles.loadingText}>
                Loading plan details...
              </CustomText>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <CustomText style={styles.label}>Plan Name</CustomText>
              <View style={styles.textInputWrapper}>
                <TextInput
                  value={planName}
                  onChangeText={setPlanName}
                  placeholder="e.g. Gold Annual Membership"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.textInput}
                />
              </View>

              <CustomText style={styles.label}>Price</CustomText>
              <View style={styles.priceRow}>
                <View
                  style={[
                    styles.priceInputWrapper,
                    isFreeTrial ? styles.priceInputDisabled : styles.priceInputActive,
                  ]}
                >
                  <CustomText style={styles.currencySymbol}>₹</CustomText>
                  <TextInput
                    value={isFreeTrial ? "0" : price}
                    onChangeText={setPrice}
                    placeholder="499"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="numeric"
                    editable={!isFreeTrial}
                    style={styles.priceInput}
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() =>
                    setIsFreeTrial((prev) => {
                      const next = !prev;
                      if (!next) setConvertToPlanId(null);
                      return next;
                    })
                  }
                  style={styles.trialToggleTouch}
                >
                  <CustomText style={styles.trialToggleText}>
                    This is Free trial
                  </CustomText>
                  <View
                    style={[
                      styles.radioCircle,
                      isFreeTrial ? styles.radioCircleActive : styles.radioCircleInactive,
                    ]}
                  >
                    {isFreeTrial ? <View style={styles.radioDot} /> : null}
                  </View>
                </TouchableOpacity>
              </View>

              {isFreeTrial ? (
                <>
                  <View style={styles.fieldSection}>
                    <CustomText style={styles.label}>
                      Free Trial Duration
                    </CustomText>
                    <View style={styles.durationInputWrapper}>
                      <TextInput
                        value={trialDurationDays}
                        onChangeText={setTrialDurationDays}
                        placeholder="e.g. 7"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        keyboardType="numeric"
                        style={styles.durationInput}
                      />
                      <CustomText style={styles.durationUnitText}>Days</CustomText>
                    </View>
                  </View>
                  <View style={styles.fieldSection}>
                    <CustomText style={styles.label}>
                      Convert to paid plan
                    </CustomText>
                    <CustomText style={styles.helperText}>
                      Optional. If unset, the trial expires with no charge.
                    </CustomText>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setConvertToPlanId(null)}
                      style={[
                        styles.planSelectCard,
                        !convertToPlanId
                          ? styles.planSelectCardSelected
                          : styles.planSelectCardUnselected,
                      ]}
                    >
                      <CustomText
                        style={[
                          styles.planSelectCardText,
                          !convertToPlanId ? styles.planSelectTextSelected : styles.planSelectTextUnselected,
                        ]}
                      >
                        Don&apos;t convert — expire only
                      </CustomText>
                    </TouchableOpacity>
                    {paidPlans.length === 0 ? (
                      <CustomText style={styles.helperText}>
                        No paid plans yet. Create one first if you want auto-convert.
                      </CustomText>
                    ) : (
                      paidPlans.map((plan) => {
                        const id = String(plan._id || plan.id || "");
                        const selected = convertToPlanId === id;
                        return (
                          <TouchableOpacity
                            key={id}
                            activeOpacity={0.7}
                            onPress={() => setConvertToPlanId(id)}
                            style={[
                              styles.planSelectCard,
                              selected ? styles.planSelectCardSelected : styles.planSelectCardUnselected,
                            ]}
                          >
                            <CustomText
                              style={[
                                styles.planSelectCardText,
                                selected ? styles.planSelectTextSelected : styles.planSelectTextUnselected,
                              ]}
                            >
                              {plan.name} · ₹{plan.price}
                            </CustomText>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.fieldSection}>
                  <CustomText style={styles.label}>
                    Billing Cycle
                  </CustomText>
                  <View style={styles.billingOptionsRow}>
                    {billingOptions.map((opt) => {
                      const isSelected = billingCycle === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          activeOpacity={0.7}
                          onPress={() => setBillingCycle(opt.key)}
                          style={[
                            styles.billingOptionBtn,
                            isSelected ? styles.billingOptionSelected : styles.billingOptionUnselected,
                          ]}
                        >
                          <CustomText
                            style={[
                              styles.billingOptionText,
                              isSelected ? styles.billingTextSelected : styles.billingTextUnselected,
                            ]}
                          >
                            {opt.label}
                          </CustomText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <CustomText style={styles.includedLabel}>
                What’s Included
              </CustomText>

              {perks.map((perk, index) => (
                <View
                  key={`${perk}-${index}`}
                  style={styles.perkRow}
                >
                  <CustomText
                    style={styles.perkText}
                    numberOfLines={1}
                  >
                    {perk}
                  </CustomText>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleRemovePerk(index)}
                    style={styles.perkRemoveBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={16} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                </View>
              ))}

              {showAddPerkInput ? (
                <View style={styles.addPerkInputWrapper}>
                  <TextInput
                    value={newPerkInput}
                    onChangeText={setNewPerkInput}
                    placeholder="e.g. Free Diet Consultation"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    autoFocus
                    onSubmitEditing={handleAddPerk}
                    style={styles.addPerkInput}
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleAddPerk}
                    style={styles.addPerkSubmitBtn}
                  >
                    <CustomText style={styles.addPerkSubmitText}>Add</CustomText>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowAddPerkInput(true)}
                  style={styles.addPerkTriggerTouch}
                >
                  <View style={styles.addPerkPlusIcon}>
                    <Ionicons name="add" size={14} color="#FFFFFF" />
                  </View>
                  <CustomText style={styles.addPerkTriggerText}>Add another perk</CustomText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSave}
                disabled={isSubmitting || isDeleting}
                style={styles.submitButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <CustomText style={styles.submitButtonText}>
                    {isEditMode ? "Update Plan" : "Create Plan"}
                  </CustomText>
                )}
              </TouchableOpacity>

              {isEditMode && (onStopPlan || onDelete) ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleStopPress}
                  disabled={isStopping || isDeleting || isSubmitting}
                  style={[
                    styles.stopPlanButton,
                    isPlanStopped ? styles.stopPlanContinued : styles.stopPlanStopped,
                  ]}
                >
                  {isStopping || isDeleting ? (
                    <ActivityIndicator color={isPlanStopped ? "#63FF61" : "#FF5252"} size="small" />
                  ) : (
                    <View style={styles.stopPlanContent}>
                      <Ionicons
                        name={isPlanStopped ? "play-circle-outline" : "pause-circle-outline"}
                        size={18}
                        color={isPlanStopped ? "#63FF61" : "#FF5252"}
                      />
                      <CustomText
                        style={[
                          styles.stopPlanText,
                          { color: isPlanStopped ? "#63FF61" : "#FF5252" },
                        ]}
                      >
                        {isPlanStopped ? "Continue Plan" : "Stop Plan"}
                      </CustomText>
                    </View>
                  )}
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>

      <ConfirmationModal
        visible={stopModalVisible}
        title={isPlanStopped ? "Continue this plan?" : "You're about to stop this plan. Continue?"}
        message={
          isPlanStopped
            ? "This plan will be activated and moved back to Live packs. New members will be able to purchase it."
            : "This pack will be moved to stopped packs and no new members can purchase it. All past records and active memberships will be preserved."
        }
        titleColor={isPlanStopped ? "#63FF61" : "#FF5454"}
        cancelText="No"
        confirmText={isPlanStopped ? "Yes, Continue" : "Yes, Stop Plan"}
        onCancel={() => setStopModalVisible(false)}
        onConfirm={() => {
          setStopModalVisible(false);
          if (onStopPlan) {
            onStopPlan();
          } else if (onDelete) {
            onDelete();
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#04060A",
  },
  flexOne: {
    flex: 1,
  },
  absoluteGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  topHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingBottom: 12,
  },
  backButton: {
    height: 50,
    width: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 28,
    letterSpacing: -0.5,
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
  },
  scrollContent: {
    ...screenContentContainerWideStyle,
    paddingTop: 8,
  },
  label: {
    marginBottom: 8,
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 16,
    color: "#FFFFFF",
  },
  textInputWrapper: {
    marginBottom: 24,
    height: 48,
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 16,
  },
  textInput: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 16,
    color: "#FFFFFF",
  },
  priceRow: {
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceInputWrapper: {
    height: 48,
    width: 154,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  priceInputActive: {
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  priceInputDisabled: {
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    opacity: 0.5,
  },
  currencySymbol: {
    marginRight: 6,
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
  },
  priceInput: {
    flex: 1,
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 16,
    color: "#FFFFFF",
  },
  trialToggleTouch: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  trialToggleText: {
    marginRight: 10,
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 16,
    color: "#FFFFFF",
  },
  radioCircle: {
    height: 20,
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1.5,
  },
  radioCircleActive: {
    borderColor: "#086CFF",
    backgroundColor: "#086CFF",
  },
  radioCircleInactive: {
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  radioDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  fieldSection: {
    marginBottom: 24,
  },
  durationInputWrapper: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: 16,
  },
  durationInput: {
    flex: 1,
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 16,
    color: "#FFFFFF",
  },
  durationUnitText: {
    marginLeft: 8,
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  helperText: {
    marginBottom: 10,
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.55)",
  },
  planSelectCard: {
    marginBottom: 8,
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  planSelectCardSelected: {
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  planSelectCardUnselected: {
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  planSelectCardText: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 14,
  },
  planSelectTextSelected: {
    fontFamily: "SpaceGrotesk-SemiBold",
    color: "#FFFFFF",
  },
  planSelectTextUnselected: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  billingOptionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  billingOptionBtn: {
    height: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  billingOptionSelected: {
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  billingOptionUnselected: {
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  billingOptionText: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 14,
  },
  billingTextSelected: {
    fontFamily: "SpaceGrotesk-SemiBold",
    color: "#FFFFFF",
  },
  billingTextUnselected: {
    color: "rgba(255, 255, 255, 0.6)",
  },
  includedLabel: {
    marginBottom: 8,
    marginTop: 4,
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 16,
    color: "#FFFFFF",
  },
  perkRow: {
    marginBottom: 10,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    backgroundColor: "#2A2A2A",
    paddingHorizontal: 16,
  },
  perkText: {
    marginRight: 8,
    flex: 1,
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
  },
  perkRemoveBtn: {
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  addPerkInputWrapper: {
    marginBottom: 12,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(8, 108, 255, 0.5)",
    backgroundColor: "#1E1E1E",
    paddingHorizontal: 12,
  },
  addPerkInput: {
    marginRight: 8,
    flex: 1,
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 15,
    color: "#FFFFFF",
  },
  addPerkSubmitBtn: {
    borderRadius: 6,
    backgroundColor: "#086CFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addPerkSubmitText: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  addPerkTriggerTouch: {
    marginBottom: 32,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  addPerkPlusIcon: {
    marginRight: 8,
    height: 20,
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  addPerkTriggerText: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 16,
    color: "#FFFFFF",
  },
  submitButton: {
    marginTop: 16,
    height: 60,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: "#2A80FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  stopPlanButton: {
    marginTop: 14,
    height: 52,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    borderWidth: 1,
  },
  stopPlanContinued: {
    borderColor: "rgba(99, 255, 97, 0.4)",
    backgroundColor: "rgba(99, 255, 97, 0.12)",
  },
  stopPlanStopped: {
    borderColor: "rgba(255, 82, 82, 0.3)",
    backgroundColor: "rgba(255, 82, 82, 0.1)",
  },
  stopPlanContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stopPlanText: {
    marginLeft: 6,
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 16,
  },
});

export default CreatePlanScreenContent;
