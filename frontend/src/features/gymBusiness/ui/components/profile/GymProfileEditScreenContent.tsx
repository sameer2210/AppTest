import React, { useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { GlassBackButton, ScreenImageBackground, DarkTimePickerModal, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { SCREEN_HORIZONTAL_PADDING_WIDE } from "@/utils/screen-layout";
import { showToastMessage } from "@/utils/app-utils";
import { useAppSelector } from "@/store/hooks";
import { PhoneVerifyModal, selectAuthUser } from "@/features/auth";
import { LocationPickerModal } from "@/features/explore";

import type { GymBusinessProfile } from "@/types/gym/businessPlan.types";

export interface OpeningHourEntry {
  dayLabel: string;
  dayKey: string;
  isAvailable: boolean;
  openTime: string;
  closeTime: string;
}

const INDIAN_PHONE_DIGITS = 10;

const toIndianPhoneDigits = (value?: string | null) =>
  (value ?? "").replace(/\D/g, "").slice(-INDIAN_PHONE_DIGITS);

const formatIndianPhoneDisplay = (value?: string | null) => {
  const digits = toIndianPhoneDigits(value);
  if (digits.length !== INDIAN_PHONE_DIGITS) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
};

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.65)",
  "rgba(8, 55, 140, 0.35)",
  "rgba(4, 12, 26, 0.85)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.28, 0.62, 1] as const;

const EMPTY_WEEKDAYS: OpeningHourEntry[] = [
  {
    dayLabel: "M",
    dayKey: "MONDAY",
    isAvailable: false,
    openTime: "06:00 AM",
    closeTime: "10:00 PM",
  },
  {
    dayLabel: "T",
    dayKey: "TUESDAY",
    isAvailable: false,
    openTime: "06:00 AM",
    closeTime: "10:00 PM",
  },
  {
    dayLabel: "W",
    dayKey: "WEDNESDAY",
    isAvailable: false,
    openTime: "06:00 AM",
    closeTime: "10:00 PM",
  },
  {
    dayLabel: "Th",
    dayKey: "THURSDAY",
    isAvailable: false,
    openTime: "06:00 AM",
    closeTime: "10:00 PM",
  },
  {
    dayLabel: "F",
    dayKey: "FRIDAY",
    isAvailable: false,
    openTime: "06:00 AM",
    closeTime: "10:00 PM",
  },
  {
    dayLabel: "Sat",
    dayKey: "SATURDAY",
    isAvailable: false,
    openTime: "08:00 AM",
    closeTime: "08:00 PM",
  },
  {
    dayLabel: "S",
    dayKey: "SUNDAY",
    isAvailable: false,
    openTime: "08:00 AM",
    closeTime: "02:00 PM",
  },
];

interface GymProfileEditScreenContentProps {
  initialProfile?: GymBusinessProfile;
  mode?: "edit" | "onboarding";
  title?: string;
  submitButtonText?: string;
  isSaving: boolean;
  onSave: (updatedData: {
    businessName: string;
    phone?: string | null;
    logoUrl?: string | null;
    location: string;
    mapLink: string;
    services: string[];
    openingHours: OpeningHourEntry[];
  }) => void;
  onPaymentDetailsPress?: () => void;
  onDiscard: () => void;
  onBack: () => void;
}

export const GymProfileEditScreenContent: React.FC<GymProfileEditScreenContentProps> = ({
  initialProfile,
  mode = "edit",
  title,
  submitButtonText,
  isSaving,
  onSave,
  onPaymentDetailsPress,
  onDiscard,
  onBack,
}) => {
  const user = useAppSelector(selectAuthUser);
  const isOnboarding = mode === "onboarding";
  const headerTitle = title || (isOnboarding ? "Register Your Business" : "Edit Profile");
  const actionButtonText = submitButtonText || "Save Changes";

  const getInitialWeeklyHours = (): OpeningHourEntry[] => {
    const weeklyHours = initialProfile?.operatingHours?.weeklyHours;
    if (Array.isArray(weeklyHours) && weeklyHours.length > 0) {
      const dayLabelMap: Record<string, string> = {
        MONDAY: "M",
        TUESDAY: "T",
        WEDNESDAY: "W",
        THURSDAY: "Th",
        FRIDAY: "F",
        SATURDAY: "Sat",
        SUNDAY: "S",
      };
      return weeklyHours.map((h) => ({
        dayLabel: dayLabelMap[h.day] || h.day.slice(0, 3),
        dayKey: h.day,
        isAvailable: Boolean(h.isAvailable),
        openTime: h.openTime || "06:00 AM",
        closeTime: h.closeTime || "10:00 PM",
      }));
    }
    return EMPTY_WEEKDAYS;
  };

  const cleanSeedName = (name?: string | null) => {
    if (!name) return "";
    const trimmed = name.trim();
    if (
      trimmed.toLowerCase() === "register your business" ||
      trimmed.toLowerCase() === "register your gym"
    ) {
      return "";
    }
    return trimmed;
  };

  const cleanSeedAddress = (addr?: string | null) => {
    if (!addr) return "";
    const trimmed = addr.trim();
    if (
      trimmed.toLowerCase() === "get listed on stron business" ||
      trimmed.toLowerCase() === "add location"
    ) {
      return "";
    }
    return trimmed;
  };

  const seedName =
    cleanSeedName(initialProfile?.businessName) ||
    cleanSeedName(initialProfile?.name) ||
    user?.onboardingBusinessName?.trim() ||
    user?.name?.trim() ||
    user?.username?.trim() ||
    "";

  const seedAddress =
    cleanSeedAddress(initialProfile?.location) ||
    cleanSeedAddress(initialProfile?.address) ||
    user?.location?.trim() ||
    user?.city?.trim() ||
    "";

  const [businessName, setBusinessName] = useState(seedName);
  const initialPhoneDigits = toIndianPhoneDigits(initialProfile?.phone || user?.contactNo);
  const [contact, setContact] = useState(initialPhoneDigits);
  const [phoneVerified, setPhoneVerified] = useState(
    Boolean(
      initialProfile?.phoneVerified ||
      user?.phoneVerified ||
      initialPhoneDigits.length === INDIAN_PHONE_DIGITS,
    ),
  );
  const [phoneVerifyOpen, setPhoneVerifyOpen] = useState(false);
  const phoneLocked = Boolean(phoneVerified && contact.length === INDIAN_PHONE_DIGITS);
  const phoneDisplay = formatIndianPhoneDisplay(contact);
  const phonePlaceholder = "98765 43210";

  const [logoUrl, setLogoUrl] = useState<string | null>(
    initialProfile?.logoUrl || (initialProfile as any)?.logo || user?.profileImageUrl || null,
  );
  const [location, setLocation] = useState(seedAddress);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [mapLink, setMapLink] = useState(initialProfile?.mapLink || "");

  const initialServices =
    (initialProfile?.services && initialProfile.services.length > 0
      ? initialProfile.services
      : null) ||
    (initialProfile?.tags && initialProfile.tags.length > 0 ? initialProfile.tags : null) ||
    (user?.onboardingBusinessOffers && user.onboardingBusinessOffers.length > 0
      ? user.onboardingBusinessOffers
      : null) ||
    (user?.onboardingBusinessFeatures && user.onboardingBusinessFeatures.length > 0
      ? user.onboardingBusinessFeatures
      : null) ||
    [];

  const [services, setServices] = useState<string[]>(initialServices);
  const [newServiceInput, setNewServiceInput] = useState("");
  const [isAddingService, setIsAddingService] = useState(false);
  const [openingHours, setOpeningHours] = useState<OpeningHourEntry[]>(getInitialWeeklyHours);

  const handlePickLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToastMessage("Permission required to update business logo");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setLogoUrl(result.assets[0].uri);
      }
    } catch {
      showToastMessage("Couldn’t open photo library. Please try again.");
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
  };

  const handleRemoveService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddService = () => {
    if (newServiceInput.trim()) {
      setServices((prev) => [...prev, newServiceInput.trim()]);
      setNewServiceInput("");
      setIsAddingService(false);
    }
  };

  const handleAddSlot = (index: number) => {
    setOpeningHours((prev) => {
      const current = prev[index];
      if (!current) return prev;

      if (!current.isAvailable) {
        // If current row is unavailable, activate it
        return prev.map((item, i) =>
          i === index
            ? { ...item, isAvailable: true, openTime: "06:00 AM", closeTime: "10:00 PM" }
            : item,
        );
      }

      // If already available, insert a new slot for the same day right after it
      const newSlot: OpeningHourEntry = {
        dayLabel: current.dayLabel,
        dayKey: current.dayKey,
        isAvailable: true,
        openTime: "06:00 AM",
        closeTime: "10:00 PM",
      };

      const updated = [...prev];
      updated.splice(index + 1, 0, newSlot);
      return updated;
    });
  };

  const handleRemoveSlot = (index: number) => {
    setOpeningHours((prev) => {
      const current = prev[index];
      if (!current) return prev;

      const sameDayCount = prev.filter((item) => item.dayKey === current.dayKey).length;

      if (sameDayCount > 1) {
        // Remove this row
        return prev.filter((_, i) => i !== index);
      }

      // If it's the only slot for this day, mark it unavailable
      return prev.map((item, i) =>
        i === index
          ? { ...item, isAvailable: false, openTime: "08:00 AM", closeTime: "08:00 PM" }
          : item,
      );
    });
  };

  const [timePickerState, setTimePickerState] = useState<{
    visible: boolean;
    dayIndex: number;
    field: "openTime" | "closeTime";
    title: string;
    initialTime: string;
  }>({
    visible: false,
    dayIndex: 0,
    field: "openTime",
    title: "Select Time",
    initialTime: "06:00 AM",
  });

  const handleUpdateTime = (index: number, field: "openTime" | "closeTime", value: string) => {
    setOpeningHours((prev) =>
      prev.map((day, i) => (i === index ? { ...day, [field]: value } : day)),
    );
  };

  const handleOpenTimePicker = (
    index: number,
    field: "openTime" | "closeTime",
    currentVal?: string,
  ) => {
    const day = openingHours[index];
    const dayName = day?.dayKey ? day.dayKey.charAt(0) + day.dayKey.slice(1).toLowerCase() : "Day";
    const fieldLabel = field === "openTime" ? "Opening Time" : "Closing Time";
    const initialTime = currentVal || (field === "openTime" ? "06:00 AM" : "10:00 PM");

    setTimePickerState({
      visible: true,
      dayIndex: index,
      field,
      title: `${dayName} - ${fieldLabel}`,
      initialTime,
    });
  };

  const handleConfirmTime = (formattedTime: string) => {
    handleUpdateTime(timePickerState.dayIndex, timePickerState.field, formattedTime);
    setTimePickerState((prev) => ({ ...prev, visible: false }));
  };

  const handleCloseTimePicker = () => {
    setTimePickerState((prev) => ({ ...prev, visible: false }));
  };

  const handleSave = () => {
    // Allow partial drafts — only normalize empties; profile completion tracks remaining fields.
    const name = businessName.trim() || "Register Your Business";
    onSave({
      businessName: name,
      phone: contact ? contact : null,
      logoUrl,
      location: location.trim(),
      mapLink: mapLink.trim(),
      services,
      openingHours,
    });
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

      <ScreenSafeArea edges={["top", "bottom"]} style={styles.flexOne}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flexOne}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Scrollable Header Title */}
            <View style={styles.headerTitleRow}>
              <CustomText style={styles.headerTitleText}>
                {headerTitle}
              </CustomText>
            </View>

            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoWrapper}>
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="cover" />
                ) : (
                  <Ionicons name="barbell" size={44} color="#FFFFFF" />
                )}
              </View>

              <View style={styles.logoActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handlePickLogo}
                  style={styles.logoButton}
                >
                  <CustomText style={styles.logoButtonText}>Change</CustomText>
                </TouchableOpacity>

                {logoUrl && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleRemoveLogo}
                    style={styles.logoRemoveButton}
                  >
                    <CustomText style={styles.logoRemoveText}>Remove</CustomText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 1. Business Name */}
            <CustomText style={styles.fieldLabel}>Business Name</CustomText>
            <View style={styles.inputContainer}>
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Alpha Fitness"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.inputText}
              />
            </View>

            {/* 2. Owner Phone Number */}
            <CustomText style={styles.fieldLabel}>Owner Phone Number</CustomText>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setPhoneVerifyOpen(true)}
              style={styles.fieldWrapper}
            >
              <View style={styles.phoneInputContainer}>
                <View style={styles.phoneRow}>
                  <CustomText
                    style={[
                      styles.phonePrefix,
                      { color: phoneDisplay ? "#FFFFFF" : "rgba(255,255,255,0.4)" },
                    ]}
                  >
                    +91
                  </CustomText>
                  <View style={styles.phoneDivider} />
                  <CustomText
                    style={[
                      styles.phoneText,
                      { color: phoneDisplay ? "#FFFFFF" : "rgba(255,255,255,0.4)" },
                    ]}
                  >
                    {phoneDisplay || phonePlaceholder}
                  </CustomText>
                  {phoneLocked ? (
                    <View style={styles.verifiedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#61DC60"
                        style={{ marginRight: 4 }}
                      />
                      <CustomText style={styles.verifiedText}>
                        Verified
                      </CustomText>
                      <Ionicons name="pencil" size={11} color="#61DC60" />
                    </View>
                  ) : (
                    <CustomText style={styles.addPhoneText}>Add</CustomText>
                  )}
                </View>
              </View>
            </TouchableOpacity>

            {/* 3. Business Location */}
            <CustomText style={styles.fieldLabel}>Business Location</CustomText>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowLocationPicker(true)}
              style={styles.locationButton}
            >
              <View style={styles.locationInnerRow}>
                <Ionicons
                  name="location-outline"
                  size={17}
                  color={location ? "#2A80FF" : "rgba(255,255,255,0.4)"}
                  style={{ marginRight: 6 }}
                />
                <CustomText
                  style={[
                    styles.locationText,
                    { color: location ? "#FFFFFF" : "rgba(255,255,255,0.4)" },
                  ]}
                  numberOfLines={1}
                >
                  {location || "Select location"}
                </CustomText>
              </View>
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

            {/* 4. Map Link */}
            <CustomText style={styles.fieldLabel}>Map Link</CustomText>
            <View style={styles.inputContainer}>
              <TextInput
                value={mapLink}
                onChangeText={setMapLink}
                placeholder="e.g. https://maps.google.com"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.mapInputText}
              />
            </View>

            {/* 4. Payment Details */}
            <TouchableOpacity activeOpacity={0.7} onPress={onPaymentDetailsPress} style={styles.fieldWrapper}>
              <LinearGradient
                colors={[
                  "rgba(42, 128, 255, 0.9)",
                  "rgba(26, 75, 175, 0.9)",
                  "rgba(15, 45, 110, 0.9)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.paymentGradient}
              >
                <View style={styles.paymentInnerRow}>
                  <Ionicons
                    name="card-outline"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 10 }}
                  />
                  <CustomText style={styles.paymentText}>Payment Details</CustomText>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </TouchableOpacity>

            {/* 5. Services Offered */}
            <View style={styles.fieldWrapper}>
              <CustomText style={styles.fieldLabel}>Services Offered</CustomText>
              <View style={styles.servicesList}>
                {services.map((service, index) => (
                  <View
                    key={index}
                    style={styles.serviceRow}
                  >
                    <CustomText
                      style={styles.serviceText}
                      numberOfLines={1}
                    >
                      {service}
                    </CustomText>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleRemoveService(index)}
                      style={styles.serviceRemoveTouch}
                    >
                      <Ionicons name="close" size={16} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                  </View>
                ))}

                {isAddingService ? (
                  <View style={styles.addServiceInputContainer}>
                    <TextInput
                      value={newServiceInput}
                      onChangeText={setNewServiceInput}
                      placeholder="Type service name..."
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      autoFocus
                      style={styles.addServiceInput}
                      onSubmitEditing={handleAddService}
                    />
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleAddService}
                      style={styles.addServiceSubmitBtn}
                    >
                      <CustomText style={styles.addServiceSubmitText}>Add</CustomText>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsAddingService(true)}
                    style={styles.addServiceDashedBtn}
                  >
                    <Ionicons name="add" size={18} color="rgba(255,255,255,0.6)" />
                    <CustomText style={styles.addServiceDashedText}>
                      Add Service
                    </CustomText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 6. Operating Hours */}
            <View style={styles.operatingHoursSection}>
              <CustomText style={styles.hoursHeaderTitle}>Opening Hours</CustomText>

              {/* Column Headers: Opens, Closes */}
              <View style={styles.hoursColumnHeaderRow}>
                <CustomText style={styles.hoursColLabel}>Opens</CustomText>
                <CustomText style={[styles.hoursColLabel, { marginLeft: 8 }]}>
                  Closes
                </CustomText>
              </View>

              <View style={styles.daysList}>
                {openingHours.map((day, index) => {
                  return (
                    <View
                      key={`${day.dayKey}-${index}`}
                      style={styles.dayRow}
                    >
                      {/* Blue Circular Day Badge */}
                      <View style={styles.dayBadge}>
                        <CustomText style={styles.dayBadgeText}>
                          {day.dayLabel}
                        </CustomText>
                      </View>

                      {day.isAvailable ? (
                        /* Active Timings Row */
                        <View style={styles.activeSlotContainer}>
                          <View style={styles.timesRow}>
                            {/* Opens Time Box */}
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleOpenTimePicker(index, "openTime", day.openTime)}
                              style={styles.timeBox}
                            >
                              <CustomText style={styles.timeBoxText}>
                                {day.openTime || "06:00 AM"}
                              </CustomText>
                            </TouchableOpacity>

                            {/* Closes Time Box */}
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() =>
                                handleOpenTimePicker(index, "closeTime", day.closeTime)
                              }
                              style={styles.timeBox}
                            >
                              <CustomText style={styles.timeBoxText}>
                                {day.closeTime || "10:00 PM"}
                              </CustomText>
                            </TouchableOpacity>
                          </View>

                          {/* Action Icons: X (Cancel/Remove) and + (Add row for same day) */}
                          <View style={styles.dayActionsRow}>
                            {/* Red X icon */}
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleRemoveSlot(index)}
                              style={styles.iconButton}
                              accessibilityRole="button"
                              accessibilityLabel="Remove timing slot"
                            >
                              <Ionicons name="close" size={20} color="#FF4D4D" />
                            </TouchableOpacity>

                            {/* Blue + icon */}
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleAddSlot(index)}
                              style={styles.iconButton}
                              accessibilityRole="button"
                              accessibilityLabel="Add timing slot"
                            >
                              <Ionicons name="add" size={22} color="#2A80FF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        /* Unavailable Row */
                        <View style={styles.unavailableSlotContainer}>
                          <View style={styles.unavailableBox}>
                            <CustomText style={styles.unavailableText}>
                              Unavailable
                            </CustomText>
                          </View>

                          {/* Blue + icon to enable this day */}
                          <View style={styles.dayActionSingle}>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => handleAddSlot(index)}
                              style={styles.iconButton}
                              accessibilityRole="button"
                              accessibilityLabel="Add timing for this day"
                            >
                              <Ionicons name="add" size={22} color="#2A80FF" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Floating Bottom Action Buttons */}
          <View style={styles.floatingBottomRow}>
            {/* Left Pill: Discard */}
            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.45)",
                "rgba(255, 255, 255, 0.08)",
                "rgba(255, 255, 255, 0.2)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.discardGradient}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onDiscard}
                style={styles.discardTouch}
              >
                <BlurView
                  intensity={Platform.OS === "ios" ? 40 : 60}
                  tint="dark"
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={[
                    "rgba(26, 75, 175, 0.45)",
                    "rgba(18, 18, 24, 0.8)",
                    "rgba(12, 12, 16, 0.92)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
                <CustomText style={styles.discardText}>
                  Discard
                </CustomText>
              </TouchableOpacity>
            </LinearGradient>

            {/* Right Pill: Save / Register Gym */}
            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.45)",
                "rgba(255, 255, 255, 0.08)",
                "rgba(255, 255, 255, 0.2)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveGradient}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSave}
                disabled={isSaving}
                style={styles.saveTouch}
              >
                <BlurView
                  intensity={Platform.OS === "ios" ? 40 : 60}
                  tint="dark"
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />
                <View
                  pointerEvents="none"
                  style={styles.saveOverlay}
                />

                <CustomText
                  style={styles.saveButtonText}
                  numberOfLines={1}
                >
                  {actionButtonText}
                </CustomText>

                <View style={styles.arrowCircle}>
                  {isSaving ? (
                    <ActivityIndicator color="#0A0A0A" size="small" />
                  ) : (
                    <Ionicons name="arrow-forward" size={24} color="#0A0A0A" />
                  )}
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </ScreenSafeArea>

      {/* Sticky Top-Left Back Button Overlay */}
      <GlassBackButton onPress={onBack} sticky size={48} iconSize={24} />

      <DarkTimePickerModal
        visible={timePickerState.visible}
        title={timePickerState.title}
        initialTime={timePickerState.initialTime}
        onClose={handleCloseTimePicker}
        onConfirm={handleConfirmTime}
      />

      <PhoneVerifyModal
        visible={phoneVerifyOpen}
        onClose={() => setPhoneVerifyOpen(false)}
        onVerified={async (contactNo) => {
          setPhoneVerifyOpen(false);
          const digits = toIndianPhoneDigits(contactNo);
          setContact(digits);
          setPhoneVerified(true);
        }}
      />

      <LocationPickerModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelectLocation={(loc) => {
          setLocation(loc.label || loc.name);
          setShowLocationPicker(false);
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
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingTop: 8,
    paddingBottom: 130,
  },
  headerTitleRow: {
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: 48,
  },
  headerTitleText: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 28,
    lineHeight: 38,
    paddingBottom: 4,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  logoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoActions: {
    gap: 10,
  },
  logoButton: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    height: 34,
    borderRadius: 21,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logoButtonText: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 14,
    color: "#FFFFFF",
  },
  logoRemoveButton: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 81, 81, 0.3)",
    height: 34,
    borderRadius: 21,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logoRemoveText: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 14,
    color: "#FF5151",
  },
  fieldLabel: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 15,
    lineHeight: 20,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  fieldWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    justifyContent: "center",
    marginBottom: 20,
  },
  inputText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "SpaceGrotesk-Regular",
    color: "#FFFFFF",
    paddingVertical: 0,
    margin: 0,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  mapInputText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "SpaceGrotesk-Regular",
    color: "#FFFFFF",
    flex: 1,
    paddingVertical: 0,
    margin: 0,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  phoneInputContainer: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  phonePrefix: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "SpaceGrotesk-Regular",
  },
  phoneDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 12,
  },
  phoneText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "SpaceGrotesk-Regular",
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#152E1D",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(97, 220, 96, 0.3)",
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk-Medium",
    color: "#61DC60",
    marginRight: 6,
  },
  addPhoneText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk-Medium",
    color: "#71BAFF",
  },
  locationButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  locationInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  locationText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "SpaceGrotesk-Regular",
    flex: 1,
  },
  paymentGradient: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#2A80FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  paymentInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  paymentText: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  servicesList: {
    gap: 8,
  },
  serviceRow: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  serviceText: {
    fontSize: 14.5,
    fontFamily: "SpaceGrotesk-Regular",
    color: "#FFFFFF",
    flex: 1,
    marginRight: 8,
  },
  serviceRemoveTouch: {
    padding: 4,
  },
  addServiceInputContainer: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(42, 128, 255, 0.5)",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addServiceInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    fontFamily: "SpaceGrotesk-Regular",
    color: "#FFFFFF",
    marginRight: 8,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  addServiceSubmitBtn: {
    backgroundColor: "#2A80FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addServiceSubmitText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk-SemiBold",
    color: "#FFFFFF",
  },
  addServiceDashedBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.25)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addServiceDashedText: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 13.5,
    color: "rgba(255, 255, 255, 0.6)",
  },
  operatingHoursSection: {
    marginBottom: 112,
  },
  hoursHeaderTitle: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  hoursColumnHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    paddingLeft: 44,
    paddingRight: 80,
  },
  hoursColLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "SpaceGrotesk-Medium",
    color: "rgba(255, 255, 255, 0.5)",
  },
  daysList: {
    gap: 8,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1E65FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  dayBadgeText: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  activeSlotContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timesRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeBox: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timeBoxText: {
    fontSize: 13.5,
    fontFamily: "SpaceGrotesk-Regular",
    color: "#FFFFFF",
  },
  dayActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    gap: 6,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
  },
  unavailableSlotContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  unavailableBox: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  unavailableText: {
    fontSize: 13.5,
    fontFamily: "SpaceGrotesk-Regular",
    color: "rgba(255, 255, 255, 0.4)",
  },
  dayActionSingle: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  floatingBottomRow: {
    position: "absolute",
    bottom: 22,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  discardGradient: {
    flex: 0.75,
    height: 56,
    borderRadius: 999,
    padding: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  discardTouch: {
    flex: 1,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  discardText: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 16,
    color: "#FF7272",
    letterSpacing: 0.2,
  },
  saveGradient: {
    flex: 1.6,
    height: 56,
    borderRadius: 999,
    padding: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  saveTouch: {
    flex: 1,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 18,
    paddingRight: 6,
  },
  saveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 18, 22, 0.84)",
  },
  saveButtonText: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 0.2,
    flex: 1,
    marginRight: 8,
  },
  arrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default GymProfileEditScreenContent;
