import React, { useEffect } from "react";
import { Linking, Platform, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { APP_IDENTITY } from "@/constants/stron";
import { getAppVersion } from "@/utils/appVersion";
import AppBlockerShell, { AppBlockerCard } from "./AppBlockerShell";
import { captureEvent } from "@/analytics/posthog/events";

const openAppStore = async () => {
  if (Platform.OS === "ios") {
    try {
      await Linking.openURL(APP_IDENTITY.iosAppStoreUrl);
    } catch {
      await Linking.openURL(`https://itunes.apple.com/app/id${APP_IDENTITY.iosAppStoreId}`).catch(
        () => undefined,
      );
    }
    return;
  }

  try {
    const marketUrl = `market://details?id=${APP_IDENTITY.androidPackage}`;
    const canOpen = await Linking.canOpenURL(marketUrl).catch(() => false);
    if (canOpen) {
      await Linking.openURL(marketUrl);
      return;
    }
    await Linking.openURL(APP_IDENTITY.androidPlayStoreUrl);
  } catch {
    await Linking.openURL(APP_IDENTITY.androidPlayStoreUrl).catch(() => undefined);
  }
};

const UpdateBlockerModal: React.FC = () => {
  const currentVersion = getAppVersion();

  useEffect(() => {
    captureEvent("update_blocker_shown");
  }, []);

  const handleUpdatePress = useCallback(() => {
    void openAppStore();
  }, []);

  return (
    <AppBlockerShell>
      <AppBlockerCard>
        {/* Blue to Deep Black Gradient Badge */}
        <LinearGradient
          colors={["#3586FF", "#0C56E8", "#03288C", "#010F42", "#000417"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.iconContainer}
        >
          <Ionicons name="download-outline" size={38} color="#FFFFFF" />
        </LinearGradient>

        {/* Title */}
        <CustomText className="font-body-medium text-[24px] text-white text-center mt-2 mb-2 leading-[28px] tracking-tight">
          Update Available
        </CustomText>

        {/* Subtitle */}
        <CustomText className="font-body text-[16px] text-white/60 text-center leading-[22px] mb-8 w-[282px]">
          A new version of STRON is ready with performance improvements and bug fixes.
        </CustomText>

        {/* Update Now Button */}
        <PressableScale
          onPress={handleUpdatePress}
          style={styles.button}
        >
          <CustomText className="font-body-medium text-white text-[16px]">Update Now</CustomText>
        </PressableScale>

        {/* Current Version Footer */}
        <CustomText className="font-body-medium text-white/60 text-[16px] text-center mt-1">
          Current v{currentVersion}
        </CustomText>
      </AppBlockerCard>
    </AppBlockerShell>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 85,
    height: 85,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    width: 282,
  },
  button: {
    width: 257,
    height: 60,
    backgroundColor: "#2A80FF",
    borderColor: "#4B8DFF",
    borderWidth: 1,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  footer: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 16,
    textAlign: "center",
    marginTop: 4,
  },
});

export default React.memo(UpdateBlockerModal);
