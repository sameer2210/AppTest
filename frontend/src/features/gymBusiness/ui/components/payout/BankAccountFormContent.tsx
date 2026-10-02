import React, { useState } from "react";
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
import { Feather } from "@expo/vector-icons";
import { GlassBackButton, ScreenImageBackground, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { screenContentContainerWideStyle } from "@/utils/screen-layout";
import type { PayoutAccountType, SavePayoutAccountInput } from "@/types/gym/payout.types";

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.65)",
  "rgba(8, 55, 140, 0.35)",
  "rgba(4, 12, 26, 0.85)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.28, 0.62, 1] as const;

interface BankAccountFormContentProps {
  initialData?: Partial<SavePayoutAccountInput>;
  gymName?: string;
  isSubmitting: boolean;
  onSubmit: (data: SavePayoutAccountInput) => void;
  onBack: () => void;
}

export const BankAccountFormContent: React.FC<BankAccountFormContentProps> = ({
  initialData,
  gymName = "your business",
  isSubmitting,
  onSubmit,
  onBack,
}) => {

  const [panNumber, setPanNumber] = useState(initialData?.panNumber || "");
  const [accountHolderName, setAccountHolderName] = useState(initialData?.accountHolderName || "");
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || "");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState(
    initialData?.confirmAccountNumber || initialData?.accountNumber || "",
  );
  const [ifsc, setIfsc] = useState(initialData?.ifsc || "");
  const [accountType, setAccountType] = useState<PayoutAccountType>(
    initialData?.accountType || "CURRENT",
  );

  const handleSubmit = () => {
    if (panNumber.trim()) {
      const cleanPan = panNumber.trim().toUpperCase();
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
      if (!panRegex.test(cleanPan)) {
        Alert.alert(
          "Invalid PAN",
          "Please enter a valid 10-character PAN number (e.g. ABCDE1234F).",
        );
        return;
      }
    }

    if (!accountHolderName.trim()) {
      Alert.alert("Required Field", "Please enter the account holder name.");
      return;
    }

    if (!accountNumber.trim() || accountNumber.length < 8) {
      Alert.alert(
        "Invalid Account Number",
        "Please enter a valid bank account number (at least 8 digits).",
      );
      return;
    }

    if (accountNumber.trim() !== confirmAccountNumber.trim()) {
      Alert.alert("Mismatch", "Account number and confirmation do not match.");
      return;
    }

    const cleanIfsc = ifsc.trim().toUpperCase();
    if (!cleanIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      Alert.alert(
        "Invalid IFSC",
        "Please enter a valid 11-character IFSC code (e.g. HDFC0001234).",
      );
      return;
    }

    onSubmit({
      panNumber: panNumber.trim().toUpperCase(),
      accountHolderName: accountHolderName.trim(),
      accountNumber: accountNumber.trim(),
      confirmAccountNumber: confirmAccountNumber.trim(),
      ifsc: cleanIfsc,
      accountType,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Screen Background Image */}
      <ScreenImageBackground source={images.HOME_V2.BG} flipY={false} edgeToEdge={true} />

      {/* Ambient Gradient Overlay */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCATIONS}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.9 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <ScreenSafeArea edges={["top"]} style={styles.keyboardView}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <GlassBackButton onPress={onBack} size={48} iconSize={24} />

            <CustomText style={styles.headerTitle}>
              Payment Details
            </CustomText>
          </View>

          {/* Section Heading */}
          <CustomText style={styles.sectionHeading}>
            Payouts
          </CustomText>
          <CustomText style={styles.sectionSubtitle}>
            Add your bank account to receive settlements from {gymName || "your business"}.
          </CustomText>

          {/* 1. PAN Number */}
          <CustomText style={styles.label}>
            PAN Number (Individual / Company)
          </CustomText>
          <View style={styles.inputContainer}>
            <TextInput
              value={panNumber}
              onChangeText={setPanNumber}
              placeholder="e.g. ABCDE1234F"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>

          {/* 2. Account Holder Name */}
          <CustomText style={styles.label}>
            Account Holder Name
          </CustomText>
          <View style={styles.inputContainer}>
            <TextInput
              value={accountHolderName}
              onChangeText={setAccountHolderName}
              placeholder="e.g. Aditya Sharma"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={styles.input}
            />
          </View>

          {/* 3. Account Number */}
          <CustomText style={styles.label}>Account Number</CustomText>
          <View style={styles.inputContainer}>
            <TextInput
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="e.g. 50100428198765"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* 4. Confirm Account Number */}
          <CustomText style={styles.label}>
            Confirm Account Number
          </CustomText>
          <View style={styles.inputContainer}>
            <TextInput
              value={confirmAccountNumber}
              onChangeText={setConfirmAccountNumber}
              placeholder="e.g. 50100428198765"
              placeholderTextColor="rgba(255,255,255,0.45)"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* 5. IFSC Code */}
          <CustomText style={styles.label}>IFSC Code</CustomText>
          <View style={styles.inputContainer}>
            <TextInput
              value={ifsc}
              onChangeText={setIfsc}
              placeholder="e.g. HDFC0001234"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>

          {/* 6. Account Type: Savings vs Current */}
          <CustomText style={styles.label}>Account Type</CustomText>
          <View style={styles.accountTypeRow}>
            {/* Savings */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setAccountType("SAVINGS")}
              style={[
                styles.accountTypeOption,
                accountType === "SAVINGS" ? styles.accountTypeOptionActive : styles.accountTypeOptionInactive,
              ]}
            >
              <View
                style={[
                  styles.radioOuter,
                  accountType === "SAVINGS" ? styles.radioOuterActive : styles.radioOuterInactive,
                ]}
              >
                {accountType === "SAVINGS" && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <CustomText
                style={[
                  styles.accountTypeText,
                  accountType === "SAVINGS" ? styles.accountTypeTextActive : styles.accountTypeTextInactive,
                ]}
              >
                Savings
              </CustomText>
            </TouchableOpacity>

            {/* Current */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setAccountType("CURRENT")}
              style={[
                styles.accountTypeOption,
                accountType === "CURRENT" ? styles.accountTypeOptionActive : styles.accountTypeOptionInactive,
              ]}
            >
              <View
                style={[
                  styles.radioOuter,
                  accountType === "CURRENT" ? styles.radioOuterActive : styles.radioOuterInactive,
                ]}
              >
                {accountType === "CURRENT" && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <CustomText
                style={[
                  styles.accountTypeText,
                  accountType === "CURRENT" ? styles.accountTypeTextActive : styles.accountTypeTextInactive,
                ]}
              >
                Current
              </CustomText>
            </TouchableOpacity>
          </View>

          {/* Encryption Note */}
          <View style={styles.noteContainer}>
            <Feather name="shield" size={18} color="#2A80FF" style={styles.shieldIcon} />
            <CustomText style={styles.noteText}>
              Your bank details are encrypted and verified securely via Razorpay. Used only for
              settlements.
            </CustomText>
          </View>

          {/* Save & Verify Action Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={styles.submitButton}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <CustomText style={styles.submitButtonText}>
                Save & Verify
              </CustomText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      </ScreenSafeArea>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#04060A",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    ...screenContentContainerWideStyle,
    paddingBottom: 90,
  },
  header: {
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 38,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13.5,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 13.5,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  inputContainer: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    justifyContent: "center",
    marginBottom: 16,
  },
  input: {
    fontSize: 15,
    color: "#FFFFFF",
  },
  accountTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  accountTypeOption: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  accountTypeOptionActive: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderWidth: 1,
    borderColor: "#086CFF",
  },
  accountTypeOptionInactive: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginRight: 10,
  },
  radioOuterActive: {
    backgroundColor: "#086CFF",
    borderColor: "#086CFF",
  },
  radioOuterInactive: {
    borderColor: "rgba(255, 255, 255, 0.4)",
    backgroundColor: "transparent",
  },
  radioInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  accountTypeText: {
    fontSize: 14,
  },
  accountTypeTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  accountTypeTextInactive: {
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "500",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  shieldIcon: {
    marginTop: 2,
  },
  noteText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    flex: 1,
    marginLeft: 10,
    lineHeight: 18,
  },
  submitButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    backgroundColor: "#086CFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonText: {
    fontWeight: "700",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});

export default BankAccountFormContent;
