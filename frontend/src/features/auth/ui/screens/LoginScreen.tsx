import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageSourcePropType,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { fontTextStyles, headingTextStyles, toTextInputTypography } from "@/utils/typography";
import { SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import { selectAuthUser } from "../../model/auth.slice";
import { completeLogin, sendOtp } from "../../model/auth.thunks";
import { showToastMessage } from "@/utils/app-utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useOtpSmsAutofill } from "@/hooks/useOtpSmsAutofill";
import { prefetchAndroidSmsAppHash } from "@/utils/androidSmsAppHash";
import { href } from "@/navigation/href";
import { router } from "expo-router";

const RESEND_TIMEOUT_SEC = 30;

/**
 * STRON Auth: Welcome + High-End Glassmorphic Login with OTP screen.
 */
const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const existingUser = useAppSelector(selectAuthUser);

  const [step, setStep] = useState<"phone_input" | "phone_otp">("phone_input");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (existingUser?.onboardingRole) {
      router.replace(href.app.tabs as never);
      return;
    }
    const digits = String(existingUser?.contactNo || "").replace(/\D/g, "");
    const hasPhone = existingUser?.phoneVerified === true || digits.length >= 10;
    if (existingUser?.uid && hasPhone) {
      router.replace(href.auth.onboarding as never);
    }
  }, [
    existingUser?.uid,
    existingUser?.onboardingRole,
    existingUser?.contactNo,
    existingUser?.phoneVerified,
  ]);

  useEffect(() => {
    if (Platform.OS === "android") {
      prefetchAndroidSmsAppHash();
    }
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSendOtp = useCallback(async () => {
    const target = phone.trim().replace(/\D/g, "");
    if (target.length < 10) {
      showToastMessage("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      await dispatch(sendOtp(target)).unwrap();
      setStep("phone_otp");
      setOtp(["", "", "", "", "", ""]);
      setResendTimer(RESEND_TIMEOUT_SEC);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (err: any) {
      showToastMessage(err?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [dispatch, phone]);

  const handleVerifyOtp = useCallback(async () => {
    const code = otp.join("");
    if (code.length < 6) {
      showToastMessage("Please enter the complete 6-digit OTP");
      return;
    }
    const target = phone.trim().replace(/\D/g, "");
    setLoading(true);
    try {
      await dispatch(
        completeLogin({ mode: "otp", phone: target, otp: code, navigate: true }),
      ).unwrap();
      showToastMessage("Signed in successfully!");
    } catch (err: any) {
      showToastMessage(err?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [dispatch, otp, phone]);

  useOtpSmsAutofill({
    enabled: step === "phone_otp",
    onCode: (code) => {
      if (code && code.length === 6) {
        const digits = code.split("");
        setOtp(digits);
        otpRefs.current[5]?.focus();
      }
    },
  });

  const handleOtpChange = useCallback(
    (text: string, index: number) => {
      const clean = text.replace(/[^0-9]/g, "");
      if (clean.length > 1) {
        const digits = clean.slice(0, 6).split("");
        const newOtp = [...otp];
        digits.forEach((d, i) => {
          newOtp[i] = d;
        });
        setOtp(newOtp);
        otpRefs.current[Math.min(digits.length, 5)]?.focus();
        return;
      }

      const newOtp = [...otp];
      newOtp[index] = clean;
      setOtp(newOtp);

      if (clean && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    },
    [otp],
  );

  const handleOtpKeyPress = useCallback(
    (e: any, index: number) => {
      if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  const isPhoneValid = phone.trim().replace(/\D/g, "").length >= 10;
  const isOtpComplete = otp.join("").length === 6;
  const cardWidth = Math.min(windowWidth - 36, 360);
  const { width: screenWidth, height: screenHeight } = Dimensions.get("screen");

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Same full-bleed stretch BG as OnboardingSlide1 — explicit size so Android honors stretch */}
        <Image
          source={images.ONBOARDING_SLIDE1_BG as ImageSourcePropType}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: screenWidth,
            height: screenHeight,
          }}
          resizeMode="stretch"
          accessibilityIgnoresInvertColors
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardContainer}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: Math.max(insets.top + 24, 52),
                paddingBottom: Math.max(insets.bottom + 20, 28),
              },
            ]}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header: Welcome to STRON */}
            <Animated.View entering={FadeInDown.duration(500)} style={styles.headerContainer}>
              <CustomText style={styles.welcomeText}>Welcome to</CustomText>
              <CustomText style={styles.stronTitle}>STRON</CustomText>
              <CustomText style={styles.taglineText}>
                {"Your fitness. Your community.\nYour competition."}
              </CustomText>
            </Animated.View>

            {/* Premium Frosted Glassmorphism Card */}
            <Animated.View
              entering={FadeIn.duration(500).delay(100)}
              style={[styles.cardWrapper, { width: cardWidth }]}
            >
              <View style={styles.glassCard}>
                {/* Frosted Backdrop Blur */}
                <BlurView
                  intensity={Platform.OS === "ios" ? 85 : 70}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                />

                {/* Dense luminous glass fill — near-opaque */}
                <LinearGradient
                  colors={[
                    "rgba(30, 85, 210, 0.82)",
                    "rgba(14, 48, 140, 0.88)",
                    "rgba(6, 24, 80, 0.94)",
                  ]}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />

                {/* Inner Card Content */}
                <View style={styles.cardContent}>
                  {/* Glowing Phone Icon Badge */}
                  <View style={styles.phoneBadgeContainer}>
                    <LinearGradient colors={["#2984FF", "#1462E6"]} style={styles.phoneBadge}>
                      <Feather name="smartphone" size={26} color="#FFFFFF" />
                    </LinearGradient>
                  </View>

                  {/* Title & Subtitle */}
                  <CustomText style={styles.cardTitle}>Login with OTP</CustomText>
                  <CustomText style={styles.cardSubtitle}>
                    {step === "phone_input"
                      ? "Verify your mobile number to get started"
                      : `Enter the code sent to +91 ${phone.slice(0, 5)} ${phone.slice(5)}`}
                  </CustomText>

                  {/* STEP 1: MOBILE NUMBER INPUT */}
                  {step === "phone_input" && (
                    <View style={styles.formContainer}>
                      <CustomText style={styles.fieldLabel}>MOBILE NUMBER</CustomText>

                      <View style={[styles.inputBox, isInputFocused && styles.inputBoxFocused]}>
                        {/* Country Code Pill */}
                        <View style={styles.countryCodeBadge}>
                          <CustomText style={styles.countryCodeText}>+91</CustomText>
                        </View>
                        <View style={styles.inputDivider} />

                        {/* Digits Input */}
                        <TextInput
                          value={phone}
                          onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ""))}
                          onFocus={() => setIsInputFocused(true)}
                          onBlur={() => setIsInputFocused(false)}
                          keyboardType="number-pad"
                          maxLength={10}
                          placeholder="Enter 10-digit number"
                          placeholderTextColor="rgba(255, 255, 255, 0.35)"
                          style={styles.textInput}
                          autoFocus
                          editable={!loading}
                          returnKeyType="done"
                          onSubmitEditing={handleSendOtp}
                          selectionColor="#38BDF8"
                        />

                        {phone.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setPhone("")}
                            activeOpacity={0.7}
                            disabled={loading}
                            style={styles.clearBtn}
                          >
                            <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Primary CTA Button */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleSendOtp}
                        disabled={loading || !isPhoneValid}
                        style={[
                          styles.primaryButton,
                          !loading && !isPhoneValid && styles.primaryButtonDisabled,
                        ]}
                      >
                        {loading ? (
                          <View style={styles.primaryButtonLoadingRow}>
                            <ActivityIndicator color="#FFFFFF" size="small" />
                            <CustomText style={styles.primaryButtonText}>SENDING...</CustomText>
                          </View>
                        ) : (
                          <CustomText style={styles.primaryButtonText}>SEND OTP</CustomText>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* STEP 2: OTP VERIFICATION */}
                  {step === "phone_otp" && (
                    <View style={styles.formContainer}>
                      <CustomText style={styles.fieldLabel}>FILL YOUR OTP</CustomText>

                      {/* 6-box OTP digits */}
                      <View style={styles.otpRow}>
                        {otp.map((digit, idx) => {
                          const isFilled = Boolean(digit);
                          return (
                            <View
                              key={idx}
                              style={[styles.otpBox, isFilled && styles.otpBoxFilled]}
                            >
                              <TextInput
                                ref={(ref) => {
                                  otpRefs.current[idx] = ref;
                                }}
                                value={digit}
                                onChangeText={(t) => handleOtpChange(t, idx)}
                                onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                                keyboardType="number-pad"
                                maxLength={Platform.OS === "android" && idx === 0 ? 6 : 1}
                                textContentType={idx === 0 ? "oneTimeCode" : "none"}
                                autoComplete={idx === 0 ? "sms-otp" : "off"}
                                style={styles.otpInput}
                                autoFocus={idx === 0}
                                editable={!loading}
                                selectionColor="#38BDF8"
                              />
                            </View>
                          );
                        })}
                      </View>

                      {/* Verify Button */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleVerifyOtp}
                        disabled={loading || !isOtpComplete}
                        style={[
                          styles.primaryButton,
                          { marginBottom: 18 },
                          !loading && !isOtpComplete && styles.primaryButtonDisabled,
                        ]}
                      >
                        {loading ? (
                          <View style={styles.primaryButtonLoadingRow}>
                            <ActivityIndicator color="#FFFFFF" size="small" />
                            <CustomText style={styles.primaryButtonText}>VERIFYING...</CustomText>
                          </View>
                        ) : (
                          <CustomText style={styles.primaryButtonText}>VERIFY</CustomText>
                        )}
                      </TouchableOpacity>

                      {/* Resend Footer */}
                      <View style={styles.resendRow}>
                        <CustomText style={styles.resendPrompt}>Didn&apos;t Receive or Missed? </CustomText>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={handleSendOtp}
                          disabled={resendTimer > 0 || loading}
                        >
                          <CustomText style={styles.resendLink}>
                            {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend it"}
                          </CustomText>
                        </TouchableOpacity>
                      </View>

                      {/* Change Number */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setStep("phone_input")}
                        disabled={loading}
                        style={styles.changeNumberBtn}
                      >
                        <CustomText style={styles.changeNumberText}>Change mobile number</CustomText>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </Animated.View>

            {/* Bottom Spacing */}
            <View style={{ height: 16 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#030A16",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
  },
  headerContainer: {
    alignItems: "center",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    marginBottom: 12,
  },
  welcomeText: {
    ...fontTextStyles.twentyTwoMediumBlack,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
  },
  stronTitle: {
    ...headingTextStyles.thirtySixExtraBoldBlack,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 2,
    textShadowColor: "rgba(29, 119, 255, 0.35)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  taglineText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.72)",
    textAlign: "center",
    marginTop: 6,
  },
  cardWrapper: {
    alignSelf: "center",
    marginVertical: "auto",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 16,
  },
  glassCard: {
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.38)",
    backgroundColor: "rgba(12, 38, 96, 0.88)",
  },
  cardContent: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 26,
    alignItems: "center",
  },
  phoneBadgeContainer: {
    marginBottom: 16,
    shadowColor: "#1D77FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  phoneBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  cardTitle: {
    ...headingTextStyles.twentyFourBoldBlack,
    color: "#FFFFFF",
    textAlign: "center",
  },
  cardSubtitle: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.72)",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  formContainer: {
    width: "100%",
  },
  fieldLabel: {
    ...fontTextStyles.twelveBoldBlack,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 8,
    textAlign: "left",
  },
  inputBox: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.28)",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  inputBoxFocused: {
    borderColor: "#38BDF8",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  countryCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countryCodeText: {
    ...fontTextStyles.sixteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  inputDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    marginHorizontal: 8,
  },
  textInput: {
    ...toTextInputTypography(fontTextStyles.sixteenSemiBoldBlack),
    flex: 1,
    color: "#FFFFFF",
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
  primaryButton: {
    width: "100%",
    height: 50,
    borderRadius: 25,
    backgroundColor: "#1D77FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1D77FF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  otpRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 22,
  },
  otpBox: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.28)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxFilled: {
    borderColor: "#38BDF8",
    backgroundColor: "rgba(29, 119, 255, 0.25)",
  },
  otpInput: {
    ...toTextInputTypography(fontTextStyles.twentyTwoBoldBlack),
    width: "100%",
    textAlign: "center",
    color: "#FFFFFF",
    padding: 0,
  },
  primaryButtonLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  resendPrompt: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.8)",
  },
  resendLink: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#38BDF8",
    textDecorationLine: "underline",
  },
  changeNumberBtn: {
    paddingVertical: 8,
    alignSelf: "center",
  },
  changeNumberText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
