import React, { useEffect } from "react";
import { Platform, StatusBar, StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as SystemUI from "expo-system-ui";
import { RootGestureContainer } from "./RootGestureContainer";
import Loader from "../components/Loader";
import NetworkState from "../components/NetworkState";
import { ToastComponent } from "../components/ToastComponent";
import { AppRemoteConfigBlocker } from "./AppRemoteConfigBlocker";
import { AppPermissionFlowModal } from "@/features/permissions";
import { setDataCollection } from "../analytics";
import { configureSystemUi } from "../utils/configureSystemUi";
import { getExpoNotifications } from "../provider/expoNotificationsLazy";
import { syncAppBadgeCount } from "@/features/notifications";
import { isLiveStickyNotification } from "@/services/notification/safeLocalNotification.service";
import { isEdgeToEdgePath } from "../navigation/isEdgeToEdgePath";
import { getSolidStatusBarColor } from "../navigation/statusBarChrome";
import { colors } from "../utils/colors";
import { AuthModalProvider } from "@/features/auth";

const isAuthPath = (pathname: string) => pathname.includes("/auth/");

const StatusBarOverlay = () => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const currentPath = pathname || "";
  const solidColor = getSolidStatusBarColor(currentPath);

  // Detail screens need a solid matching fill (not the default blue scrim / transparent hole).
  if (solidColor) {
    return (
      <View
        pointerEvents="none"
        style={[styles.statusBarOverlay, { height: insets.top, backgroundColor: solidColor }]}
      />
    );
  }

  // Auth (onboarding / login) + edge-to-edge: let the screen background fill the status area.
  if (isEdgeToEdgePath(currentPath) || isAuthPath(currentPath)) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.statusBarOverlay, { height: insets.top, backgroundColor: colors.statusBar }]}
    />
  );
};

export const RootAppChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const currentPath = pathname || "";
  const isAuth = isAuthPath(currentPath);
  const isEdgeToEdge = isEdgeToEdgePath(currentPath) || isAuth;
  const solidStatusBarColor = getSolidStatusBarColor(currentPath);
  const statusBarColor =
    solidStatusBarColor ?? (isEdgeToEdge ? colors.transparent : colors.statusBar);
  const rootBackgroundColor = solidStatusBarColor ?? (isEdgeToEdge ? "#000000" : colors.surface);

  useEffect(() => {
    void configureSystemUi();
    // Keep Firebase Analytics off until post-login trackingInitialization.
    void setDataCollection(false);
  }, []);

  useEffect(() => {
    // Edge-to-edge Android ignores system background / status bar color APIs.
    if (Platform.OS === "android" && isEdgeToEdge) return;
    const next = solidStatusBarColor ?? (isEdgeToEdge ? "#000000" : colors.surface);
    void SystemUI.setBackgroundColorAsync(next).catch(() => { });
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(statusBarColor, true);
    }
  }, [solidStatusBarColor, statusBarColor, isEdgeToEdge]);

  useEffect(() => {
    const Notifications = getExpoNotifications();
    if (!Notifications) return;

    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const isLiveSticky = isLiveStickyNotification(notification);

        return {
          shouldPlaySound: !isLiveSticky,
          shouldSetBadge: false,
          shouldShowBanner: !isLiveSticky,
          shouldShowList: true,
        };
      },
    });

    void syncAppBadgeCount();

    // Never re-schedule received pushes/locals — Expo already shows foreground banners.
    // Re-scheduling caused unbounded spam for event publish, payments, etc.
    const subscription = Notifications.addNotificationReceivedListener(() => {
      void syncAppBadgeCount();
    });
    return () => subscription.remove();
  }, []);

  return (
    <AuthModalProvider>
      <StatusBar
        {...(Platform.OS === "android" && isEdgeToEdge
          ? { translucent: true }
          : { backgroundColor: statusBarColor, translucent: true })}
        barStyle="light-content"
      />
      <RootGestureContainer style={[styles.container, { backgroundColor: rootBackgroundColor }]}>
        <SafeAreaProvider>
          <View style={[styles.container, { backgroundColor: rootBackgroundColor }]}>
            <StatusBarOverlay />
            {children}
          </View>
        </SafeAreaProvider>
      </RootGestureContainer>
      <Loader />
      <NetworkState />
      <ToastComponent />
      <AppRemoteConfigBlocker />
      <AppPermissionFlowModal />
    </AuthModalProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  statusBarOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 9999,
  },
});
