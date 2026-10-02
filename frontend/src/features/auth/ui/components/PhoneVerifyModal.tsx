import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Modal, Platform, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { showToastMessage } from "@/utils/app-utils";
import { useOtpSmsAutofill } from "@/hooks/useOtpSmsAutofill";
import { prefetchAndroidSmsAppHash } from "@/utils/androidSmsAppHash";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "../../model/auth.slice";
import {
  sendPhoneVerificationOtp,
  resendPhoneVerificationOtp,
  verifyPhoneForCurrentUser,
} from "../../model/auth.thunks";
import { RevenueCatService } from "@/features/payments";

type Step = "phone" | "otp";

export type PhoneVerifyModalProps = {
  visible: boolean;
  onClose: () => void;
  onVerified: (contactNo: string) => void | Promise<void>;
  onSendOtp?: (phone: string) => Promise<void>;
  onResendOtp?: (phone: string) => Promise<void>;
  onVerifyOtp?: (
    phone: string,
    otp: string,
  ) => Promise<{ contactNo: string; phoneVerified?: boolean } | void>;
};

const MINIMUM_PHONE_REGEX = /^\+?[1-9]\d{5,14}$/;
const RESEND_SECONDS = 30;

export const PhoneVerifyModal = ({
  visible,
  onClose,
  onVerified,
  onSendOtp,
  onResendOtp,
  onVerifyOtp,
}: PhoneVerifyModalProps) => {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector(selectAuthUser);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const pendingAutofillVerify = useRef(false);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      setStep("phone");
      setPhone("");
      setOtp(["", "", "", "", "", ""]);
      setBusy(false);
      setResendTimer(0);
      setKeyboardHeight(0);
      pendingAutofillVerify.current = false;
      verifyingRef.current = false;
      return;
    }
    if (Platform.OS === "android") {
      prefetchAndroidSmsAppHash();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  useEffect(() => {
    if (step !== "otp") return;
    const timer = setTimeout(() => otpRefs.current[0]?.focus(), 300);
    return () => clearTimeout(timer);
  }, [step]);

  const sendOtp = async () => {
    if (!MINIMUM_PHONE_REGEX.test(phone.replace(/\s+/g, ""))) {
      showToastMessage("Enter a valid mobile number.");
      return;
    }
    setBusy(true);
    try {
      if (onSendOtp) {
        await onSendOtp(phone);
      } else {
        await dispatch(sendPhoneVerificationOtp(phone)).unwrap();
      }
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      setResendTimer(RESEND_SECONDS);
      showToastMessage("OTP sent.");
    } catch (error) {
      showToastMessage((error as Error)?.message || "Failed to send OTP.");
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (resendTimer > 0 || busy) return;
    if (!MINIMUM_PHONE_REGEX.test(phone.replace(/\s+/g, ""))) {
      showToastMessage("Enter a valid mobile number.");
      return;
    }
    setBusy(true);
    try {
      if (onResendOtp) {
        await onResendOtp(phone);
      } else if (onSendOtp) {
        await onSendOtp(phone);
      } else {
        await dispatch(resendPhoneVerificationOtp(phone)).unwrap();
      }
      setResendTimer(RESEND_SECONDS);
      showToastMessage("OTP resent.");
    } catch (error) {
      showToastMessage((error as Error)?.message || "Failed to resend OTP.");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = useCallback(
    async (codeOverride?: string) => {
      if (verifyingRef.current) return;
      const code = codeOverride || otp.join("");
      if (code.length !== 6) {
        showToastMessage("Enter the 6-digit OTP.");
        return;
      }
      verifyingRef.current = true;
      setBusy(true);
      try {
        if (onVerifyOtp) {
          const res = await onVerifyOtp(phone, code);
          const contact = res?.contactNo || phone;
          if (authUser) {
            void RevenueCatService.syncProfileAttributes({
              ...authUser,
              contactNo: contact,
              phoneVerified: res?.phoneVerified !== false,
              isGuest: false,
            });
          }
          await onVerified(contact);
        } else {
          const verified = await dispatch(verifyPhoneForCurrentUser({ phone, code })).unwrap();
          if (authUser) {
            void RevenueCatService.syncProfileAttributes({
              ...authUser,
              contactNo: verified.contactNo,
              phoneVerified: verified.phoneVerified !== false,
              isGuest: false,
            });
          }
          await onVerified(phone);
        }
      } catch (error) {
        showToastMessage((error as Error)?.message || "Invalid OTP.");
      } finally {
        verifyingRef.current = false;
        setBusy(false);
      }
    },
    [otp, phone, onVerifyOtp, onVerified, dispatch, authUser],
  );

  const fillOtpFromAutofill = useCallback((code: string, autoVerify = false) => {
    const digits = code.replace(/\D/g, "").slice(0, 6);
    const next = ["", "", "", "", "", ""];
    digits.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setOtp(next);
    if (autoVerify && digits.length === 6) {
      pendingAutofillVerify.current = true;
    }
  }, []);

  useOtpSmsAutofill({
    enabled: visible && step === "otp",
    onCode: (code) => fillOtpFromAutofill(code, true),
  });

  useEffect(() => {
    if (!pendingAutofillVerify.current) return;
    if (otp.join("").length !== 6) return;
    pendingAutofillVerify.current = false;
    void verifyOtp(otp.join(""));
  }, [otp, verifyOtp]);

  const onOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length > 1) {
      fillOtpFromAutofill(cleaned, true);
      return;
    }
    const digit = cleaned.slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (digit && index === 5 && next.every((d) => d.length === 1)) {
      void verifyOtp(next.join(""));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/50" onPress={onClose} />
        <Animated.View
          entering={SlideInDown.duration(260)}
          exiting={SlideOutDown.duration(200)}
          className="bg-white rounded-t-[30px] w-full items-center pt-2"
          style={{
            marginBottom: keyboardHeight,
            paddingBottom: keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 16),
          }}
        >
          <View className="w-[73px] h-[6px] rounded-full bg-black/20 mb-6 mt-1" />

          <PressableScale onPress={onClose} className="absolute right-6 top-6 p-2">
            <Ionicons name="close" size={24} color="#000" />
          </PressableScale>

          <View className="w-[70px] h-[70px] rounded-full bg-[#2a80ff] items-center justify-center mb-5">
            <Ionicons name="phone-portrait-outline" size={32} color="#FFF" />
          </View>

          <CustomText className="font-body-medium text-[24px] text-black mb-2">
            Verify your number
          </CustomText>
          <CustomText className="font-body text-[14px] text-black/80 text-center px-8 mb-8 leading-[19px]">
            Verify your mobile number once to unlock all eligible STRON features.
          </CustomText>

          <View className="w-full px-6">
            {step === "phone" ? (
              <>
                <CustomText className="font-body-medium text-[14px] text-black/50 mb-2 uppercase">
                  PHONE NUMBER
                </CustomText>
                <View className="h-[53px] rounded-[13px] border border-[#c9c9c9] px-4 flex-row items-center">
                  <CustomText className="font-body text-[16px] text-black">+91</CustomText>
                  <View className="w-[1px] h-[24px] bg-[#c9c9c9] mx-3" />
                  <TextInput
                    value={phone}
                    onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))}
                    keyboardType="number-pad"
                    placeholder="9876543210"
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    className="flex-1 text-black text-[16px] font-body p-0"
                    maxLength={10}
                    autoFocus
                  />
                </View>

                <PressableScale
                  onPress={sendOtp}
                  disabled={busy}
                  className="w-[213px] h-[51px] rounded-[48px] bg-[#2a80ff] items-center justify-center self-center mt-10 mb-2"
                >
                  <CustomText className="font-body-medium text-[16px] text-white">
                    {busy ? "SENDING..." : "SEND OTP"}
                  </CustomText>
                </PressableScale>
              </>
            ) : (
              <>
                <CustomText className="font-body-medium text-[14px] text-black/50 mb-2 uppercase">
                  FILL YOUR OTP
                </CustomText>
                <View className="flex-row justify-between h-[53px] gap-2">
                  {otp.map((digit, index) => (
                    <TextInput
                      key={`otp-${index}`}
                      ref={(ref) => {
                        otpRefs.current[index] = ref;
                      }}
                      value={digit}
                      onChangeText={(v) => onOtpChange(index, v)}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
                          otpRefs.current[index - 1]?.focus();
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={Platform.OS === "android" && index === 0 ? 6 : 1}
                      textContentType={index === 0 ? "oneTimeCode" : "none"}
                      autoComplete={index === 0 ? "sms-otp" : "off"}
                      className="flex-1 rounded-[13px] border border-[#c9c9c9] text-black text-[20px] font-body text-center p-0"
                    />
                  ))}
                </View>

                <PressableScale
                  onPress={() => void verifyOtp()}
                  disabled={busy}
                  className="w-[213px] h-[51px] rounded-[48px] bg-[#2a80ff] items-center justify-center self-center mt-10"
                >
                  <CustomText className="font-body-medium text-[16px] text-white">
                    {busy ? "VERIFYING..." : "VERIFY"}
                  </CustomText>
                </PressableScale>

                <View className="flex-row items-center justify-center mt-6">
                  <CustomText className="font-body text-[14px] text-black leading-[19px]">
                    Didn&apos;t Receive or Missed?{" "}
                  </CustomText>
                  <PressableScale onPress={resendOtp} disabled={resendTimer > 0 || busy}>
                    <CustomText className="font-body text-[14px] text-[#2a80ff] underline leading-[19px]">
                      {resendTimer > 0 ? `Resend it (${resendTimer}s)` : "Resend it"}
                    </CustomText>
                  </PressableScale>
                </View>
                <PressableScale onPress={() => setStep("phone")} className="mt-4 pb-2">
                  <CustomText className="font-body text-[13px] text-black/50 text-center underline">
                    Change phone number
                  </CustomText>
                </PressableScale>
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default PhoneVerifyModal;
