import React, { useEffect, useRef, useState } from "react";
import CustomText from "@/components/CustomText";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import type { StronUser } from "@/models/user";
import { saveUserProfile } from "../../model/user.thunks";
import { showToastMessage } from "@/utils/app-utils";
import { TOAST_PRESETS } from "@/utils/constants";
import { images } from "@/utils/images";
import KeyboardAwareScrollView from "@/components/KeyboardAwareScrollView";
import CreateGlassField from "@/components/form/CreateGlassField";
import PublishActionBar from "@/components/actionBar/PublishActionBar";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { fontTextStyles } from "@/utils/typography";
import {
  SCREEN_CONTENT_PADDING_BOTTOM,
  SCREEN_HORIZONTAL_PADDING_WIDE,
  screenContentContainerWideStyle,
} from "@/utils/screen-layout";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const BankDetailsScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const [accountHolderName, setAccountHolderName] = useState(user?.receiverName || "");
  const [bankName, setBankName] = useState(user?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(user?.bankAccountNumber || "");
  const [ifscCode, setIfscCode] = useState(user?.bankIfscCode || "");
  const [loading, setLoading] = useState(false);
  const hydratedUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid || hydratedUidRef.current === user.uid) return;
    hydratedUidRef.current = user.uid;
    setAccountHolderName(user.receiverName || "");
    setBankName(user.bankName || "");
    setAccountNumber(user.bankAccountNumber || "");
    setIfscCode(user.bankIfscCode || "");
  }, [user]);

  const validateAndSave = async () => {
    if (!user?.uid) return;

    const receiverName = accountHolderName.trim();
    const bankNameTrimmed = bankName.trim();
    const bankAccountNumber = accountNumber.trim();
    const bankIfscCode = ifscCode.trim().toUpperCase();

    if (!receiverName) {
      showToastMessage("Account holder name is required.", TOAST_PRESETS.FAILURE);
      return;
    }
    if (!bankNameTrimmed) {
      showToastMessage("Bank name is required.", TOAST_PRESETS.FAILURE);
      return;
    }
    if (!bankAccountNumber || !/^\d{9,18}$/.test(bankAccountNumber)) {
      showToastMessage("Enter a valid account number (9-18 digits).", TOAST_PRESETS.FAILURE);
      return;
    }
    if (!IFSC_PATTERN.test(bankIfscCode)) {
      showToastMessage("Enter a valid IFSC code.", TOAST_PRESETS.FAILURE);
      return;
    }

    setLoading(true);
    try {
      const payload: StronUser = {
        ...user,
        receiverName,
        bankName: bankNameTrimmed,
        bankAccountNumber,
        bankIfscCode,
      };

      await dispatch(saveUserProfile(payload)).unwrap();
      showToastMessage("Bank details saved.", TOAST_PRESETS.SUCCESS);
      router.back();
    } catch (error) {
      showToastMessage(
        error instanceof Error ? error.message : "Failed to save bank details",
        TOAST_PRESETS.FAILURE,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAccountNumberChange = (text: string) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, "");
    setAccountNumber(cleaned);
  };

  const handleIfscChange = (text: string) => {
    // Only allow alphanumeric, auto capitalize
    const cleaned = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    setIfscCode(cleaned);
  };

  if (!user) {
    return (
      <View style={styles.notFoundContainer}>
        <CustomText style={styles.notFoundText}>User not found</CustomText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Gradient — same as Profile / Edit Profile */}
      <Image
        source={images.STEP_RACE.BG}
        style={styles.bgImage}
        resizeMode="stretch"
      />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          screenContentContainerWideStyle,
          { paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 90 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <PressableScale
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </PressableScale>
          <CustomText style={styles.headerTitle}>Bank Details</CustomText>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.View
          entering={FadeInDown.duration(400)}
          layout={LinearTransition}
          style={styles.formContent}
        >
          <CustomText style={styles.descriptionText}>
            Add your bank account for event rewards and payouts.
          </CustomText>

          <CreateGlassField
            label="ACCOUNT HOLDER NAME"
            value={accountHolderName}
            onChangeText={setAccountHolderName}
            placeholder="Name as per bank records"
            autoCapitalize="words"
          />

          <View style={styles.fieldSpacer} />

          <CreateGlassField
            label="BANK NAME"
            value={bankName}
            onChangeText={setBankName}
            placeholder="e.g., HDFC Bank"
            autoCapitalize="words"
          />

          <View style={styles.fieldSpacer} />

          <CreateGlassField
            label="ACCOUNT NUMBER"
            value={accountNumber}
            onChangeText={handleAccountNumberChange}
            placeholder="Enter account number"
            keyboardType="number-pad"
          />

          <View style={styles.fieldSpacer} />

          <CreateGlassField
            label="IFSC CODE"
            value={ifscCode}
            onChangeText={handleIfscChange}
            placeholder="e.g., HDFC0001234"
            autoCapitalize="characters"
          />
        </Animated.View>
      </KeyboardAwareScrollView>

      <View style={styles.actionFooter}>
        <PublishActionBar
          label="Save Details"
          onPress={() => void validateAndSave()}
          loading={loading}
          variant="glass"
          circleVariant="white"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#021124",
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: "#021124",
    paddingTop: 18,
  },
  notFoundText: {
    ...fontTextStyles.twentyTwoNormalBlack,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 40,
  },
  bgImage: {
    position: "absolute",
    top: -screenHeight * 0.2,
    left: 0,
    width: screenWidth,
    height: screenHeight * 1.4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...fontTextStyles.twentyEightMediumBlack,
    color: "#FFFFFF",
  },
  headerSpacer: {
    width: 50,
  },
  formContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
  },
  descriptionText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#D9D9D9",
    marginBottom: 24,
  },
  fieldSpacer: {
    height: 20,
  },
  actionFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingTop: 10,
    backgroundColor: "transparent",
    paddingBottom: 30,
  },
});

export default BankDetailsScreen;

