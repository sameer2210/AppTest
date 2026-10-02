import React, { useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { getAppVersion } from "@/utils/appVersion";
import AppBlockerShell, { AppBlockerCard } from "./AppBlockerShell";
import { captureEvent } from "@/analytics/posthog/events";

type MaintenanceBlockerModalProps = {
  estimatedTime?: string;
  onCheckAgain?: () => void;
};

const MaintenanceBlockerModal = ({ onCheckAgain }: MaintenanceBlockerModalProps) => {
  const currentVersion = getAppVersion();

  useEffect(() => {
    captureEvent("maintenance_blocker_shown");
  }, []);

  return (
    <AppBlockerShell>
      <AppBlockerCard>
        {/* Blue to Deep Black Gradient Badge */}
        <LinearGradient
          colors={["#3586FF", "#0C56E8", "#03288C", "#010F42", "#000417"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            width: 85,
            height: 85,
            borderRadius: 58,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons name="warning-outline" size={38} color="#FFFFFF" />
        </LinearGradient>

        {/* Title */}
        <CustomText className="font-body-medium text-[24px] text-white text-center mt-2 mb-2 leading-[28px] tracking-tight">
          We’ll be right back
        </CustomText>

        {/* Subtitle */}
        <CustomText className="font-body text-[16px] text-white/60 text-center leading-[22px] mb-8 w-[284px]">
          STRON is currently undergoing scheduled maintenance. We’re working to make things better.
        </CustomText>

        {/* Check Again Button */}
        <PressableScale
          onPress={onCheckAgain}
          className="w-[257px] h-[60px] bg-[#2A80FF] border border-[#4B8DFF] rounded-[54px] items-center justify-center mb-4 active:opacity-90 shadow-md shadow-blue-500/20"
        >
          <CustomText className="font-body-medium text-white text-[16px]">Check Again</CustomText>
        </PressableScale>

        {/* Current Version Footer */}
        <CustomText className="font-body-medium text-white/60 text-[16px] text-center mt-1">
          Current v{currentVersion}
        </CustomText>
      </AppBlockerCard>
    </AppBlockerShell>
  );
};

export default MaintenanceBlockerModal;
