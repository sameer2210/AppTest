import React, { ReactNode, useEffect } from "react";
import { BackHandler, Modal, View } from "react-native";

type AppBlockerShellProps = {
  children: ReactNode;
};

const AppBlockerShell = ({ children }: AppBlockerShellProps) => {
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, []);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={() => undefined}
    >
      <View className="flex-1 bg-[#050506]/90 items-center justify-center px-4 py-4">
        {children}
      </View>
    </Modal>
  );
};

export const AppBlockerCard = ({ children }: { children: ReactNode }) => (
  <View className="w-[316px] max-w-full bg-[#2E2E32]/90 border border-white/10 rounded-[38px] pt-8 pb-7 px-5 items-center shadow-2xl">
    {children}
  </View>
);

// Backward compatibility helper style exports
export const blockerHeroImageStyle = (aspectRatio?: number) => ({});
export const blockerTitleStyle = {};
export const blockerMutedTextStyle = {};

export default AppBlockerShell;
