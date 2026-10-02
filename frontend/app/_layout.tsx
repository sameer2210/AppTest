import "../global.css";
import "../src/i18n";
import { Stack, usePathname } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { PostHogProvider } from "posthog-react-native";
import { useEffect } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { StyleSheet, LogBox } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { rootFonts } from "../src/constants/fonts";
import { store } from "../src/store";
import { posthog } from "../src/analytics/posthog/client";
import { BRAND } from "../src/constants/stron";
import { isEdgeToEdgePath } from "../src/navigation/isEdgeToEdgePath";
import { RootAppChrome } from "../src/shell/RootAppChrome";
import { NavigationAnalytics } from "../src/shell/NavigationAnalytics";
import { StronBootstrap } from "../src/shell/StronBootstrap";

LogBox.ignoreLogs([
  "Unable to activate keep awake",
  "[RevenueCat]",
  "PurchaseInvalidError",
  "Please ensure the app is signed correctly",
]);

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const layoutStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BRAND.backgroundDark,
  },
});

const RootLayout = () => {
  const [fontsLoaded, fontError] = useFonts(rootFonts);
  const canShowApp = fontsLoaded || !!fontError;

  useEffect(() => {
    if (!canShowApp) {
      return;
    }
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [canShowApp]);

  const pathname = usePathname();
  const currentPath = pathname || "";
  const isEdgeToEdge = isEdgeToEdgePath(currentPath);

  if (!canShowApp) {
    return null;
  }

  return (
    <PostHogProvider client={posthog} debug={__DEV__} autocapture={false}>
      <ReduxProvider store={store}>
        <RootAppChrome>
          <StronBootstrap />
          <NavigationAnalytics />
          <SafeAreaView
            style={[layoutStyles.safe, isEdgeToEdge && { backgroundColor: "transparent" }]}
            edges={isEdgeToEdge ? ["right", "left"] : ["right", "left", "top"]}
          >
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: isEdgeToEdge ? "transparent" : BRAND.backgroundDark,
                },
              }}
            />
          </SafeAreaView>
        </RootAppChrome>
      </ReduxProvider>
    </PostHogProvider>
  );
};

export default RootLayout;
