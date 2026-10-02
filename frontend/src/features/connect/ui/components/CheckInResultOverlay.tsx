import React, { memo } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { href } from "@/navigation/href";
import { PressableScale, ScreenImageBackground, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { SCREEN_CONTENT_PADDING_BOTTOM } from "@/utils/screen-layout";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

export type CheckInResultState = {
  status: "success" | "failed";
  title: string;
  subtitle: string;
  buttonText: string;
  onPressAction?: () => void;
};

type Props = {
  state: CheckInResultState;
  onDismiss: () => void;
};

export const CheckInResultOverlay = memo(({ state, onDismiss }: Props) => {
  const isSuccess = state.status === "success";

  const handleButtonPress = () => {
    onDismiss();
    if (state.onPressAction) {
      state.onPressAction();
    } else if (isSuccess) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(href.app.home as never);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScreenImageBackground source={images.HOME_V2.BG} flipY edgeToEdge />

      <ScreenSafeArea>
        <View
          style={[
            styles.contentWrapper,
            {
              paddingTop: 8,
              paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM,
              paddingHorizontal: 22,
            },
          ]}
        >
          {/* Top Close Button */}
          <View style={styles.topRow}>
            <PressableScale
              onPress={onDismiss}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={23} color="#FFFFFF" />
            </PressableScale>
          </View>

          {/* Center Badge & Title Section */}
          <View style={styles.centerSection}>
            <View
              style={[
                styles.outerCircle,
                isSuccess ? styles.outerCircleSuccess : styles.outerCircleFailed,
              ]}
            >
              <View
                style={[
                  styles.middleCircle,
                  isSuccess ? styles.middleCircleSuccess : styles.middleCircleFailed,
                ]}
              >
                <View
                  style={[
                    styles.innerCircle,
                    isSuccess ? styles.innerCircleSuccess : styles.innerCircleFailed,
                  ]}
                >
                  <Ionicons
                    name={isSuccess ? "checkmark" : "close"}
                    size={isSuccess ? 46 : 48}
                    color={isSuccess ? "#000000" : "#FF4D4D"}
                  />
                </View>
              </View>
            </View>

            <CustomText style={styles.title}>
              {state.title}
            </CustomText>
          </View>

          {/* Bottom Subtitle & Action Section */}
          <View style={styles.bottomSection}>
            <CustomText
              style={[
                styles.subtitle,
                isSuccess ? styles.subtitleSuccess : styles.subtitleFailed,
              ]}
            >
              {state.subtitle}
            </CustomText>

            <PressableScale
              onPress={handleButtonPress}
              style={styles.actionButton}
            >
              <CustomText style={styles.actionButtonText}>{state.buttonText}</CustomText>
            </PressableScale>
          </View>
        </View>
      </ScreenSafeArea>
    </View>
  );
});

CheckInResultOverlay.displayName = "CheckInResultOverlay";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050B18",
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  closeButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  centerSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  outerCircle: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 70,
    borderWidth: 2,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  outerCircleSuccess: {
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  outerCircleFailed: {
    borderColor: "rgba(255, 124, 124, 0.4)",
  },
  middleCircle: {
    width: 115,
    height: 115,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 57.5,
    borderWidth: 2,
  },
  middleCircleSuccess: {
    borderColor: "#FFFFFF",
  },
  middleCircleFailed: {
    borderColor: "#FF9B9B",
  },
  innerCircle: {
    width: 90,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 45,
    elevation: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  innerCircleSuccess: {
    backgroundColor: "#FFFFFF",
  },
  innerCircleFailed: {
    backgroundColor: "#FFC7C7",
  },
  title: {
    marginTop: 32,
    textAlign: "center",
    ...headingTextStyles.h1,
    fontSize: 34,
    lineHeight: 42,
    color: "#FFFFFF",
  },
  bottomSection: {
    width: "100%",
    alignItems: "center",
  },
  subtitle: {
    marginBottom: 24,
    textAlign: "center",
    fontSize: 16,
  },
  subtitleSuccess: {
    ...fontTextStyles.medium,
    color: "rgba(255, 255, 255, 0.9)",
  },
  subtitleFailed: {
    ...fontTextStyles.semiBold,
    color: "#FF5C5C",
  },
  actionButton: {
    height: 56,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  actionButtonText: {
    ...fontTextStyles.semiBold,
    fontSize: 18,
    color: "#000000",
  },
});

export default CheckInResultOverlay;
