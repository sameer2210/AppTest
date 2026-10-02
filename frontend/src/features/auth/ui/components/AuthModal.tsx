import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomText from "@/components/CustomText";
import { completeLogin, sendOtp } from "../../model/auth.thunks";
import { showToastMessage } from "@/utils/app-utils";
import { useAppDispatch } from "@/store/hooks";
import { useOtpSmsAutofill } from "@/hooks/useOtpSmsAutofill";
import { fontTextStyles, headingTextStyles, toTextInputTypography } from "@/utils/typography";
import { prefetchAndroidSmsAppHash } from "@/utils/androidSmsAppHash";

export type AuthModalStep = "methods" | "phone_input" | "phone_otp";

type AuthModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialStep?: AuthModalStep;
  /** When false, hide close/backdrop dismiss (primary login landing). Default true. */
  dismissible?: boolean;
  /** When false, hide guest sign-in (STRON PRO purchase requires a real account). */
  allowGuest?: boolean;
};

const RESEND_TIMEOUT_SEC = 30;

/* ── REUSABLE SUB-COMPONENTS ── */

const TermsFooter = memo(() => (
  <CustomText style={styles.termsText}>
    By continuing, you agree to Stron&apos;s{" "}
    <CustomText style={styles.termsLink}>Terms and Privacy Policy.</CustomText>
  </CustomText>
));
TermsFooter.displayName = "TermsFooter";

type OtpInputBoxesProps = {
  otp: string[];
  otpRefs: React.MutableRefObject<(TextInput | null)[]>;
  onChange: (text: string, index: number) => void;
  onKeyPress: (e: any, index: number) => void;
  editable?: boolean;
};

const OtpInputBoxes = memo(({ otp, otpRefs, onChange, onKeyPress, editable = true }: OtpInputBoxesProps) => (
  <View style={styles.otpRow}>
    {otp.map((digit, idx) => {
      const isFilled = Boolean(digit);
      return (
        <View
          key={idx}
          style={[styles.otpBox, isFilled ? styles.otpBoxFilled : styles.otpBoxEmpty]}
        >
          <TextInput
            ref={(ref) => {
              otpRefs.current[idx] = ref;
            }}
            value={digit}
            onChangeText={(t) => onChange(t, idx)}
            onKeyPress={(e) => onKeyPress(e, idx)}
            keyboardType="number-pad"
            maxLength={Platform.OS === "android" && idx === 0 ? 6 : 1}
            textContentType={idx === 0 ? "oneTimeCode" : "none"}
            autoComplete={idx === 0 ? "sms-otp" : "off"}
            style={[
              styles.otpInput,
              Platform.OS === "android"
                ? {
                    ...toTextInputTypography(fontTextStyles.twentyFourBoldBlack),
                    textAlignVertical: "center",
                  }
                : undefined,
            ]}
            autoFocus={idx === 0}
            editable={editable}
          />
        </View>
      );
    })}
  </View>
));
OtpInputBoxes.displayName = "OtpInputBoxes";

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary";
};

const ActionButton = memo(
  ({ label, onPress, loading, disabled, iconName, variant = "primary" }: ActionButtonProps) => {
    const isInactive = disabled && !loading;
    const loadingLabel =
      label === "VERIFY" ? "VERIFYING..." : label === "SEND OTP" ? "SENDING..." : label;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.actionBtn,
          variant === "secondary" ? styles.actionBtnSecondary : styles.actionBtnPrimary,
          isInactive && styles.actionBtnDisabled,
        ]}
      >
        {loading ? (
          <View style={styles.actionBtnLoadingRow}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <CustomText style={styles.actionBtnText}>{loadingLabel}</CustomText>
          </View>
        ) : (
          <View style={styles.actionBtnContent}>
            {iconName && (
              <View style={styles.actionBtnIcon}>
                <Ionicons name={iconName} size={20} color="#FFFFFF" />
              </View>
            )}
            <CustomText style={styles.actionBtnText}>{label}</CustomText>
          </View>
        )}
      </TouchableOpacity>
    );
  },
);
ActionButton.displayName = "ActionButton";

/* ── MAIN COMPONENT ── */

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialStep = "methods",
  dismissible = true,
  allowGuest = true,
}) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const [step, setStep] = useState<AuthModalStep>(initialStep);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (visible) {
      setStep(initialStep);
      setPhone("");
      setOtp(["", "", "", "", "", ""]);
      setLoading(false);
      setKeyboardHeight(0);
      if (Platform.OS === "android") {
        prefetchAndroidSmsAppHash();
      }
    }
  }, [visible, initialStep]);

  useEffect(() => {
    if (!visible) return;
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // Google Sign-In
  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true);
    try {
      await dispatch(completeLogin({ mode: "google", navigate: !onSuccess })).unwrap();
      showToastMessage("Signed in successfully!");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (err?.message !== "Sign in cancelled") {
        showToastMessage(err?.message || "Google Sign-In failed");
      }
    } finally {
      setLoading(false);
    }
  }, [dispatch, onClose, onSuccess]);

  // Apple Sign-In (iOS)
  const handleAppleSignIn = useCallback(async () => {
    setLoading(true);
    try {
      await dispatch(completeLogin({ mode: "apple", navigate: !onSuccess })).unwrap();
      showToastMessage("Signed in successfully!");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (err?.message !== "Sign in cancelled") {
        showToastMessage(err?.message || "Apple Sign-In failed");
      }
    } finally {
      setLoading(false);
    }
  }, [dispatch, onClose, onSuccess]);

  // Guest Mode
  const handleGuestSignIn = useCallback(async () => {
    setLoading(true);
    try {
      await dispatch(completeLogin({ mode: "guest", navigate: !onSuccess })).unwrap();
      showToastMessage("Signed in as Guest!");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (err?.message !== "Sign in cancelled") {
        showToastMessage(err?.message || "Guest Sign-In failed");
      }
    } finally {
      setLoading(false);
    }
  }, [dispatch, onClose, onSuccess]);

  // Phone OTP Send
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

  // Phone OTP Verify
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
        completeLogin({ mode: "otp", phone: target, otp: code, navigate: !onSuccess }),
      ).unwrap();
      showToastMessage("Signed in successfully!");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToastMessage(err?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [dispatch, otp, phone, onClose, onSuccess]);

  // Auto-fill OTP on Android if received via SMS Retriever
  useOtpSmsAutofill({
    enabled: visible && step === "phone_otp",
    onCode: (code) => {
      if (code && code.length === 6) {
        const digits = code.split("");
        setOtp(digits);
        otpRefs.current[5]?.focus();
      }
    },
  });

  // OTP Input handlers
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

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismissible ? onClose : undefined}
    >
      <View style={styles.modalContainer}>
        {dismissible ? (
          <Pressable style={styles.backdrop} onPress={onClose} />
        ) : (
          <View style={styles.backdrop} />
        )}
        <Animated.View
          entering={SlideInDown.duration(260)}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.sheet,
            {
              marginBottom: keyboardHeight,
              paddingBottom: keyboardHeight > 0 ? 14 : Math.max(insets.bottom, 16) + 12,
            },
          ]}
        >
          {/* Header Drag Handle & Close */}
          <View style={styles.handleRow}>
            <View style={styles.handleWrapper}>
              <View style={styles.handleBar} />
            </View>
            {dismissible && step !== "methods" && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={17} color="#1F2937" />
              </TouchableOpacity>
            )}
          </View>

          {/* ── CARD 1: "Login to Continue" ── */}
          {step === "methods" && (
            <View style={styles.stepContentCenter}>
              <CustomText style={styles.methodsTitle}>
                Login to Continue
              </CustomText>
              <ActionButton
                label="Continue with Number"
                iconName="phone-portrait-outline"
                onPress={() => setStep("phone_input")}
                disabled={loading}
              />
              <ActionButton
                label="Continue with Google"
                iconName="logo-google"
                variant="secondary"
                onPress={handleGoogleSignIn}
                loading={loading}
              />
              {Platform.OS === "ios" && (
                <ActionButton
                  label="Continue with Apple"
                  iconName="logo-apple"
                  variant="secondary"
                  onPress={handleAppleSignIn}
                  loading={loading}
                />
              )}
              {allowGuest ? (
                <TouchableOpacity
                  activeOpacity={loading ? 1 : 0.7}
                  onPress={handleGuestSignIn}
                  disabled={loading}
                  style={styles.guestBtn}
                >
                  <CustomText style={styles.guestBtnText}>Continue as Guest</CustomText>
                </TouchableOpacity>
              ) : (
                <View style={styles.guestBtn}>
                  <CustomText style={styles.proHint}>
                    Sign in with Google, Apple, or phone to subscribe to STRON PRO.
                  </CustomText>
                </View>
              )}

              <TermsFooter />
            </View>
          )}

          {/* ── CARD 2: Phone Input Step ── */}
          {step === "phone_input" && (
            <View style={styles.stepContent}>
              <View style={styles.phoneIconBadge}>
                <Ionicons name="phone-portrait-outline" size={22} color="#FFFFFF" />
              </View>

              <CustomText style={styles.stepTitle}>
                Verify your number
              </CustomText>
              <CustomText style={styles.stepSubtitle}>
                Verify your mobile number once to unlock all eligible STRON features.
              </CustomText>

              <CustomText style={styles.inputLabel}>
                MOBILE NUMBER
              </CustomText>
              <View style={styles.phoneInputContainer}>
                <CustomText style={styles.countryCode}>+91</CustomText>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="Enter 10-digit number"
                  placeholderTextColor="#9CA3AF"
                  style={[
                    styles.phoneTextInput,
                    Platform.OS === "android"
                      ? { textAlignVertical: "center", includeFontPadding: false }
                      : undefined,
                  ]}
                  autoFocus
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                />
                {phone.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setPhone("")}
                    activeOpacity={loading ? 1 : 0.7}
                    disabled={loading}
                    style={styles.clearIconBtn}
                  >
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              <ActionButton label="SEND OTP" onPress={handleSendOtp} loading={loading} />

              <TermsFooter />
            </View>
          )}

          {/* ── CARD 3: Phone OTP Step ── */}
          {step === "phone_otp" && (
            <View style={styles.stepContent}>
              <View style={styles.phoneIconBadge}>
                <Ionicons name="phone-portrait-outline" size={22} color="#FFFFFF" />
              </View>

              <CustomText style={styles.stepTitle}>
                Verify your number
              </CustomText>
              <CustomText style={styles.otpSubtitle}>
                Enter the 6-digit code sent to +91 {phone}.
              </CustomText>

              <CustomText style={styles.otpLabel}>
                FILL YOUR OTP
              </CustomText>

              <OtpInputBoxes
                otp={otp}
                otpRefs={otpRefs}
                onChange={handleOtpChange}
                onKeyPress={handleOtpKeyPress}
                editable={!loading}
              />

              <ActionButton label="VERIFY" onPress={handleVerifyOtp} loading={loading} />

              <View style={styles.resendRow}>
                <CustomText style={styles.resendPrompt}>Didn&apos;t Receive or Missed? </CustomText>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleSendOtp}
                  disabled={resendTimer > 0 || loading}
                >
                  <CustomText style={styles.resendAction}>
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend it"}
                  </CustomText>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={loading ? 1 : 0.7}
                onPress={() => setStep("phone_input")}
                disabled={loading}
                style={styles.changePhoneBtn}
              >
                <CustomText style={styles.changePhoneText}>
                  Change mobile number
                </CustomText>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  termsText: {
    ...fontTextStyles.regular,
    fontSize: 12,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 16,
  },
  termsLink: {
    color: "#2B82F6",
  },
  otpRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  otpBox: {
    width: 44,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  otpBoxFilled: {
    borderColor: "#2B82F6",
    backgroundColor: "rgba(43, 130, 246, 0.05)",
  },
  otpBoxEmpty: {
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  otpInput: {
    width: 44,
    height: 50,
    textAlign: "center",
    ...fontTextStyles.bold,
    fontSize: 20,
    color: "#111827",
    padding: 0,
  },
  actionBtn: {
    width: "100%",
    height: 50,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  actionBtnPrimary: {
    backgroundColor: "#2B82F6",
  },
  actionBtnSecondary: {
    backgroundColor: "#808080",
  },
  actionBtnDisabled: {
    opacity: 0.7,
  },
  actionBtnLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionBtnText: {
    ...fontTextStyles.bold,
    color: "#FFFFFF",
    fontSize: 15.5,
    letterSpacing: 0.3,
  },
  actionBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnIcon: {
    marginRight: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handleRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    position: "relative",
    minHeight: 30,
  },
  handleWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  closeBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  stepContent: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  stepContentCenter: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 4,
  },
  methodsTitle: {
    ...headingTextStyles.h3,
    fontSize: 21,
    color: "#000000",
    marginBottom: 24,
    textAlign: "center",
  },
  guestBtn: {
    marginBottom: 24,
    paddingVertical: 4,
  },
  guestBtnText: {
    ...fontTextStyles.medium,
    fontSize: 14.5,
    color: "#111827",
    textDecorationLine: "underline",
  },
  proHint: {
    ...fontTextStyles.regular,
    color: "#6B7280",
    textAlign: "center",
  },
  phoneIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  stepTitle: {
    ...headingTextStyles.h3,
    fontSize: 21,
    color: "#000000",
    marginBottom: 2,
  },
  stepSubtitle: {
    ...fontTextStyles.regular,
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 16,
    lineHeight: 18,
  },
  inputLabel: {
    ...fontTextStyles.semiBold,
    fontSize: 11.5,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  phoneInputContainer: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  countryCode: {
    ...fontTextStyles.semiBold,
    fontSize: 16,
    color: "#111827",
    marginRight: 8,
  },
  phoneTextInput: {
    flex: 1,
    ...fontTextStyles.medium,
    fontSize: 16,
    color: "#111827",
    padding: 0,
  },
  clearIconBtn: {
    padding: 4,
  },
  otpSubtitle: {
    ...fontTextStyles.regular,
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 12,
    lineHeight: 18,
  },
  otpLabel: {
    ...fontTextStyles.semiBold,
    fontSize: 11.5,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  resendPrompt: {
    ...fontTextStyles.regular,
    fontSize: 13,
    color: "#374151",
  },
  resendAction: {
    ...fontTextStyles.medium,
    fontSize: 13,
    color: "#2B82F6",
    textDecorationLine: "underline",
  },
  changePhoneBtn: {
    paddingVertical: 4,
    alignSelf: "center",
  },
  changePhoneText: {
    ...fontTextStyles.medium,
    fontSize: 12,
    color: "#6B7280",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});

export default memo(AuthModal);
