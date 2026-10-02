import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { getOtpVerifyModule } from "../provider/otpVerifyLazy";

const OTP_LENGTH = 6;

const extractOtp = (message: string) => {
  const match = new RegExp(`(\\d{${OTP_LENGTH}})`).exec(message);
  return match?.[1] ?? null;
};

/** Returns the Android SMS Retriever app hash for the current signing certificate. */
export const getAndroidAppHash = async (): Promise<string | null> => {
  if (Platform.OS !== "android") {
    return null;
  }

  const otpVerify = getOtpVerifyModule();
  if (!otpVerify) {
    return null;
  }

  try {
    const hashes = await otpVerify.getHash();
    return hashes[0] ?? null;
  } catch {
    if (__DEV__) {
      console.warn(
        "[OTP] getAndroidAppHash unavailable — rebuild dev client with react-native-otp-verify",
      );
    }
    return null;
  }
};

type UseOtpSmsAutofillOptions = {
  enabled: boolean;
  onCode: (code: string) => void;
};

const startListener = async (onMessage: (message: string) => void, onTimeout: () => void) => {
  const otpVerify = getOtpVerifyModule();
  if (!otpVerify) {
    return;
  }

  try {
    await otpVerify.startOtpListener((message: string) => {
      if (message === "Timeout Error.") {
        onTimeout();
        return;
      }
      onMessage(message);
    });
  } catch {
    if (__DEV__) {
      console.warn(
        "[OTP] SMS Retriever native module unavailable — rebuild dev client with expo run:android",
      );
    }
  }
};

/** Listens for incoming OTP SMS on Android (SMS Retriever API). */
export const useOtpSmsAutofill = ({ enabled, onCode }: UseOtpSmsAutofillOptions) => {
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  useEffect(() => {
    if (!enabled || Platform.OS !== "android") {
      return;
    }

    const otpVerify = getOtpVerifyModule();
    if (!otpVerify) {
      return;
    }

    let cancelled = false;
    let timeoutRestarted = false;

    const handleMessage = (message: string) => {
      if (cancelled) {
        return;
      }
      const code = extractOtp(message);
      if (code) {
        onCodeRef.current(code);
      }
    };

    const handleTimeout = () => {
      if (cancelled || timeoutRestarted) {
        return;
      }
      timeoutRestarted = true;
      otpVerify.removeListener();
      void startListener(handleMessage, () => {});
    };

    void startListener(handleMessage, handleTimeout);

    return () => {
      cancelled = true;
      otpVerify.removeListener();
    };
  }, [enabled]);
};

export { OTP_LENGTH };
