import { StatusBar, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import StronWebView from "@/components/StronWebView";
import { PressableScale } from "@/components/ui";
import { isPolicyPageId, POLICY_PAGES } from "@/constants/policyPages";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";

const readParam = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : Array.isArray(value) ? value[0] || "" : "";

const PolicyWebViewScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ policy?: string; title?: string; url?: string }>();

  const policyId = readParam(params.policy);
  const policy = isPolicyPageId(policyId) ? POLICY_PAGES[policyId] : null;
  const title = policy?.title || readParam(params.title) || "Policy";
  const url = policy?.url || readParam(params.url);

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const headerTopPadding = topInset + 8;
  const webContentTopOffset = headerTopPadding + 20;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Floating Header */}
      <View
        style={[styles.header, { paddingTop: headerTopPadding }]}
        pointerEvents="box-none"
      >
        <PressableScale
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </PressableScale>
        <View style={styles.titleContainer} pointerEvents="none">
          <CustomText
            style={[headingTextStyles.h1, styles.titleText]}
            numberOfLines={1}
          >
            {title}
          </CustomText>
        </View>
      </View>

      {/* Full-Screen Web Content */}
      {url ? (
        <View style={styles.webContentWrapper}>
          <StronWebView uri={url} topOffset={webContentTopOffset} />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <CustomText style={styles.emptyText}>
            This page is not available right now.
          </CustomText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#021429",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: 0,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  titleContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  titleText: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textAlign: "right",
  },
  webContentWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
  },
});

export default PolicyWebViewScreen;

