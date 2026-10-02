import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Dimensions,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser, PhoneVerifyModal } from "@/features/auth";
import { StronUser } from "@/models/user";
import { showToastMessage } from "@/utils/app-utils";
import { images } from "@/utils/images";
import { GlassView } from "@/components/GlassView";
import { GlassSurface } from "@/components/ui";
import ConfirmationModal from "@/components/confirmation/ConfirmationModal";
import {
  getDeterministicBitmoji,
  getProfileImageSource,
  isBitmojiUrl,
} from "@/utils/profileImage.utils";
import { LocationPickerModal } from "@/features/explore";
import { uploadProfileImageThunk, type LocationSuggestion } from "@/features/core";
import { saveUserProfile } from "../../model/user.thunks";
import { RevenueCatService } from "@/features/payments";
import { TOAST_PRESETS } from "@/utils/constants";
import { SCREEN_CONTENT_PADDING_BOTTOM, SCREEN_HORIZONTAL_PADDING_WIDE } from "@/utils/screen-layout";

const INDIAN_PHONE_DIGITS = 10;

const toIndianPhoneDigits = (value?: string | null) =>
  (value ?? "").replace(/\D/g, "").slice(-INDIAN_PHONE_DIGITS);

const formatIndianPhoneDisplay = (value?: string | null) => {
  const digits = toIndianPhoneDigits(value);
  if (digits.length !== INDIAN_PHONE_DIGITS) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
};

const EditProfileScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const initialLocation =
    user?.location?.trim() || [user?.city, user?.state].filter(Boolean).join(", ") || "";

  const [name, setName] = useState(user?.username || "");
  const [contact, setContact] = useState(toIndianPhoneDigits(user?.contactNo));
  const [location, setLocation] = useState(initialLocation);
  const [city, setCity] = useState(user?.city || "");
  const [stateName, setStateName] = useState(user?.state || "");
  const [shortBio, setShortBio] = useState(user?.shortBio || "");
  const [about, setAbout] = useState(user?.about || "");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl ?? null);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [phoneVerifyOpen, setPhoneVerifyOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const hydratedUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid || hydratedUidRef.current === user.uid) return;
    hydratedUidRef.current = user.uid;
    setName(user.username || "");
    setContact(toIndianPhoneDigits(user.contactNo));
    setLocation(user.location?.trim() || [user.city, user.state].filter(Boolean).join(", ") || "");
    setCity(user.city || "");
    setStateName(user.state || "");
    setShortBio(user.shortBio || "");
    setAbout(user.about || "");
    setProfileImageUrl(user.profileImageUrl ?? null);
    setPhotoUri(null);
    setImageError(false);
  }, [user]);

  const onSelectLocation = (loc: LocationSuggestion) => {
    setLocation(loc.label || loc.name);
    setCity(loc.city || loc.name || "");
    setStateName(loc.state || "");
    setLocationPickerOpen(false);
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToastMessage("Permission required to update profile photo");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
        setProfileImageUrl(null);
        setImageError(false);
      }
    } catch {
      // Gracefully handle picker dismissal or system dialog cancellation
    }
  };

  const confirmRemoveImage = () => {
    setRemoveModalVisible(true);
  };

  const executeRemoveImage = () => {
    setPhotoUri(null);
    setProfileImageUrl(null);
    setImageError(false);
    setRemoveModalVisible(false);
  };

  const validateAndSave = async () => {
    if (!user?.uid) return;

    const username = name.trim() || user.username;
    if (!username?.trim()) {
      showToastMessage("Name cannot be empty.");
      return;
    }

    const contactDigits = toIndianPhoneDigits(contact);
    if (contactDigits && contactDigits.length !== INDIAN_PHONE_DIGITS) {
      showToastMessage("Enter a valid mobile number.");
      return;
    }

    const messageFromUnknown = (error: unknown, fallback: string) => {
      if (error instanceof Error && error.message.trim()) return error.message;
      if (typeof error === "string" && error.trim()) return error;
      if (error && typeof error === "object" && "message" in error) {
        const msg = (error as { message?: unknown }).message;
        if (typeof msg === "string" && msg.trim()) return msg;
      }
      return fallback;
    };

    setLoading(true);
    try {
      let nextImageUrl = profileImageUrl;
      if (photoUri) {
        showToastMessage("Uploading profile image...", TOAST_PRESETS.INFO);
        nextImageUrl = await dispatch(
          uploadProfileImageThunk({
            uri: photoUri,
            publicId: `${user.uid}_${Date.now()}`,
          }),
        ).unwrap();
      }

      const payload: StronUser = {
        ...user,
        username,
        profileImageUrl: nextImageUrl,
        contactNo: contactDigits || user.contactNo,
        about: about.trim(),
        location: location.trim(),
        shortBio: shortBio.trim(),
        city: city.trim() || user.city || null,
        state: stateName.trim() || user.state || null,
      };

      await executeSaveProfile(payload);
    } catch (error) {
      showToastMessage(
        messageFromUnknown(error, "Failed to update profile"),
        TOAST_PRESETS.FAILURE,
      );
      setLoading(false);
    }
  };

  const executeSaveProfile = async (payload: StronUser) => {
    setLoading(true);
    try {
      await dispatch(saveUserProfile(payload)).unwrap();
      void RevenueCatService.syncProfileAttributes(payload);
      showToastMessage("Profile updated successfully!", TOAST_PRESETS.SUCCESS);
      router.back();
    } catch (error) {
      showToastMessage(
        error instanceof Error ? error.message : "Failed to save profile",
        TOAST_PRESETS.FAILURE,
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const previewUri = photoUri || profileImageUrl;
  const defaultBitmojiKey = getDeterministicBitmoji(user.uid);
  const effectiveBitmojiKey = photoUri
    ? null
    : profileImageUrl && profileImageUrl.startsWith("bt")
      ? profileImageUrl
      : !profileImageUrl
        ? defaultBitmojiKey
        : null;
  const isBitmoji = isBitmojiUrl(previewUri);
  const showAsBitmoji = isBitmoji || imageError;
  const bitmojiKey = effectiveBitmojiKey || defaultBitmojiKey;
  const bitmojiSource = images.BITMOJI[bitmojiKey as keyof typeof images.BITMOJI];
  const photoSource = photoUri
    ? { uri: photoUri }
    : getProfileImageSource(profileImageUrl, user.uid);
  const BITMOJIS = [
    "bt1",
    "bt2",
    "bt3",
    "bt4",
    "bt5",
    "bt6",
    "bt7",
    "bt8",
    "bt9",
    "bt10",
    "bt11",
    "bt12",
  ] as const;
  const existingPhoneDigits = toIndianPhoneDigits(user.contactNo);
  const phoneLocked = Boolean(existingPhoneDigits || user.phoneVerified);
  const phoneDisplay = formatIndianPhoneDisplay(contact || existingPhoneDigits);
  const phonePlaceholder = "98765 43210";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        {/* Background Gradient */}
        <Image
          source={images.STEP_RACE.BG}
          style={{
            position: "absolute",
            top: -screenHeight * 0.2,
            left: 0,
            width: screenWidth,
            height: screenHeight * 1.4,
          }}
          resizeMode="stretch"
        />

        <ScrollView
          contentContainerStyle={{ paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 90 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Image Section */}
          <View style={styles.topImageSection}>
            {showAsBitmoji ? (
              <LinearGradient
                colors={["#192B44", "#021124"]}
                style={styles.bitmojiGradient}
              >
                <Image
                  key={`bitmoji_${previewUri || defaultBitmojiKey}`}
                  source={bitmojiSource}
                  style={styles.bitmojiImage}
                  resizeMode="contain"
                />
              </LinearGradient>
            ) : (
              <ImageBackground
                key={`custom_${previewUri || defaultBitmojiKey}`}
                source={photoSource}
                style={styles.fullSize}
                imageStyle={{ resizeMode: "cover" }}
                onError={() => setImageError(true)}
              >
                <View style={styles.imageOverlay} />
              </ImageBackground>
            )}

            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            {/* Image Controls */}
            <View style={styles.imageControlsRow}>
              <TouchableOpacity
                onPress={confirmRemoveImage}
                style={styles.controlButton}
                activeOpacity={0.7}
              >
                <CustomText
                  text="Remove"
                  style={[fontTextStyles.bodyBold, styles.removeText]}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={pickImage}
                style={styles.controlButton}
                activeOpacity={0.7}
              >
                <CustomText
                  text="Change Image"
                  style={[fontTextStyles.bodySemiBold, styles.changeImageText]}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bitmoji Selector */}
          <View style={styles.bitmojiSelectorSection}>
            <CustomText
              text="Select an Avatar"
              style={[fontTextStyles.bodyMedium, styles.bitmojiSelectorTitle]}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bitmojiScrollRow}>
              {BITMOJIS.map((key) => {
                const isSelected = effectiveBitmojiKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => {
                      setProfileImageUrl(key);
                      setPhotoUri(null);
                      setImageError(false);
                    }}
                    activeOpacity={0.7}
                    style={[
                      styles.bitmojiItem,
                      isSelected ? styles.bitmojiItemSelected : styles.bitmojiItemUnselected,
                    ]}
                  >
                    <LinearGradient
                      colors={["#192B44", "#021124"]}
                      style={styles.bitmojiGradientContainer}
                    >
                      <Image
                        source={getProfileImageSource(key)}
                        style={styles.fullSize}
                        resizeMode="contain"
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Form Fields Section */}
          <View style={styles.formSection}>
            <View style={styles.fieldWrapper}>
              <CustomText text="Phone Number" style={[fontTextStyles.bodyMedium, styles.fieldLabel]} />
              <TouchableOpacity
                activeOpacity={phoneLocked ? 1 : 0.7}
                disabled={phoneLocked}
                onPress={() => setPhoneVerifyOpen(true)}
              >
                <GlassView
                  intensity={40}
                  tint="dark"
                  style={styles.inputGlass}
                >
                  <View style={styles.phoneInputRow}>
                    <CustomText
                      text="+91"
                      style={[
                        fontTextStyles.body,
                        phoneDisplay ? styles.phoneTextActive : styles.phoneTextPlaceholder,
                      ]}
                    />
                    <View style={styles.phoneDivider} />
                    <CustomText
                      text={phoneDisplay || phonePlaceholder}
                      style={[
                        fontTextStyles.body,
                        styles.phoneMainText,
                        phoneDisplay ? styles.phoneTextActive : styles.phoneTextPlaceholder,
                      ]}
                    />
                    {phoneLocked ? (
                      <CustomText
                        text={
                          user.phoneVerified || Boolean(existingPhoneDigits) ? "Verified" : "Saved"
                        }
                        style={[fontTextStyles.body, styles.phoneStatusText]}
                      />
                    ) : (
                      <CustomText text="Add" style={[fontTextStyles.body, styles.phoneAddText]} />
                    )}
                  </View>
                </GlassView>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldWrapper}>
              <CustomText text="Name" style={[fontTextStyles.bodyMedium, styles.fieldLabel]} />
              <GlassView
                intensity={40}
                tint="dark"
                style={styles.inputGlass}
              >
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Harshit Gujar"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={[fontTextStyles.body, styles.textInput]}
                />
              </GlassView>
            </View>

            <View style={styles.fieldWrapper}>
              <CustomText text="Location" style={[fontTextStyles.bodyMedium, styles.fieldLabel]} />
              <TouchableOpacity activeOpacity={0.7} onPress={() => setLocationPickerOpen(true)}>
                <GlassView
                  intensity={40}
                  tint="dark"
                  style={[styles.inputGlass, styles.locationGlass]}
                >
                  <CustomText
                    text={location || "Set your city"}
                    style={[
                      fontTextStyles.body,
                      styles.locationText,
                      { color: location ? "#FFFFFF" : "rgba(255,255,255,0.4)" },
                    ]}
                    numberOfLines={1}
                  />
                  <Ionicons name="location-outline" size={20} color="#71BAFF" />
                </GlassView>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldWrapper}>
              <CustomText text="Short Bio" style={[fontTextStyles.bodyMedium, styles.fieldLabel]} />
              <GlassView
                intensity={40}
                tint="dark"
                style={styles.inputGlass}
              >
                <TextInput
                  value={shortBio}
                  onChangeText={setShortBio}
                  placeholder="e.g., Marathon runner & step challenge fan"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  maxLength={60}
                  style={[fontTextStyles.body, styles.textInput]}
                />
              </GlassView>
            </View>

            <View style={styles.lastFieldWrapper}>
              <View style={styles.descriptionHeaderRow}>
                <CustomText text="Description" style={[fontTextStyles.bodyMedium, styles.fieldLabelNoMargin]} />
                <CustomText text="200 Character" style={[fontTextStyles.body, styles.charCountText]} />
              </View>
              <GlassView
                intensity={40}
                tint="dark"
                style={styles.descriptionGlass}
              >
                <TextInput
                  value={about}
                  onChangeText={setAbout}
                  placeholder="Fitness is more than a routine—it's my lifestyle. From marathons to step challenges, I enjoy pushing my limits, meeting new people, and celebrating every milestone along the way."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                  textAlignVertical="top"
                  maxLength={200}
                  style={[fontTextStyles.body, styles.descriptionInput]}
                />
              </GlassView>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Floating Action Bar — liquid glass */}
        <View style={styles.bottomActionBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.bottomActionButton} activeOpacity={0.7}>
            <GlassSurface
              intensity={Platform.OS === "ios" ? 55 : 80}
              borderRadius={35}
              shine
              style={styles.actionGlass}
            >
              <View style={styles.discardInner}>
                <CustomText
                  text="Discard"
                  style={[headingTextStyles.h3, styles.discardText]}
                />
              </View>
            </GlassSurface>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void validateAndSave()}
            disabled={loading}
            style={styles.bottomActionButton}
            activeOpacity={0.7}
          >
            <GlassSurface
              intensity={Platform.OS === "ios" ? 55 : 80}
              borderRadius={35}
              shine
              style={styles.actionGlass}
            >
              <View style={styles.saveInner}>
                <CustomText
                  text={loading ? "Saving" : "Save"}
                  style={[headingTextStyles.h3, styles.saveText]}
                />
                <View style={styles.saveIconWrapper}>
                  <Image
                    source={images.HOME_V2.TAB_FAB_BG}
                    style={styles.fullSizeAbsolute}
                    resizeMode="contain"
                  />
                  <Ionicons name="arrow-forward" size={24} color="white" style={styles.zIndex10} />
                </View>
              </View>
            </GlassSurface>
          </TouchableOpacity>
        </View>

        <ConfirmationModal
          visible={removeModalVisible}
          title="Do you want to Remove your Picture ?"
          cancelText="No"
          confirmText="Yes, Remove"
          onCancel={() => setRemoveModalVisible(false)}
          onConfirm={executeRemoveImage}
        />

        <PhoneVerifyModal
          visible={phoneVerifyOpen}
          onClose={() => setPhoneVerifyOpen(false)}
          onVerified={async (contactNo) => {
            setPhoneVerifyOpen(false);
            setContact(toIndianPhoneDigits(contactNo));
          }}
        />

        <LocationPickerModal
          visible={locationPickerOpen}
          onClose={() => setLocationPickerOpen(false)}
          onSelectLocation={onSelectLocation}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#021124",
  },
  topImageSection: {
    width: "100%",
    height: 350,
    position: "relative",
    overflow: "hidden",
  },
  bitmojiGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  bitmojiImage: {
    width: "100%",
    height: "100%",
  },
  fullSize: {
    width: "100%",
    height: "100%",
  },
  fullSizeAbsolute: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  backButton: {
    position: "absolute",
    top: 48,
    left: 20,
    width: 42,
    height: 42,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 50,
  },
  imageControlsRow: {
    position: "absolute",
    bottom: 24,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 16,
    zIndex: 50,
  },
  controlButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  removeText: {
    fontSize: 15,
    color: "#ff4040",
  },
  changeImageText: {
    fontSize: 15,
    color: "#000000",
  },
  bitmojiSelectorSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  bitmojiSelectorTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 12,
  },
  bitmojiScrollRow: {
    flexDirection: "row",
  },
  bitmojiItem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    marginRight: 12,
  },
  bitmojiItemSelected: {
    borderColor: "#FFFFFF",
    borderWidth: 3,
  },
  bitmojiItemUnselected: {
    borderColor: "transparent",
    borderWidth: 2,
    opacity: 0.75,
  },
  bitmojiGradientContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  formSection: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingTop: 24,
  },
  fieldWrapper: {
    marginBottom: 24,
  },
  lastFieldWrapper: {
    marginBottom: 40,
  },
  fieldLabel: {
    color: "#FFFFFF",
    fontSize: 18,
    marginBottom: 8,
  },
  fieldLabelNoMargin: {
    color: "#FFFFFF",
    fontSize: 18,
  },
  inputGlass: {
    borderRadius: 12,
    height: 55,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 12,
  },
  phoneMainText: {
    flex: 1,
  },
  phoneTextActive: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  phoneTextPlaceholder: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 16,
  },
  phoneStatusText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  phoneAddText: {
    fontSize: 12,
    color: "#71BAFF",
  },
  textInput: {
    color: "#FFFFFF",
    fontSize: 16,
    width: "100%",
  },
  locationGlass: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationText: {
    fontSize: 16,
    flex: 1,
    paddingRight: 12,
  },
  descriptionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  charCountText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
  },
  descriptionGlass: {
    borderRadius: 12,
    minHeight: 120,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  descriptionInput: {
    color: "#FFFFFF",
    fontSize: 16,
    height: 100,
    width: "100%",
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 24,
    width: "100%",
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 50,
    gap: 16,
  },
  bottomActionButton: {
    flex: 1,
  },
  discardText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  saveText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  saveIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  zIndex10: {
    zIndex: 10,
  },
  actionGlass: {
    height: 60,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  discardInner: {
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  saveInner: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 28,
    paddingRight: 4,
  },
});

export default EditProfileScreen;

