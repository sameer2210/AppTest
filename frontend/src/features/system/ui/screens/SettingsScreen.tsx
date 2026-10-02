import { StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppScrollView, PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import {
  SCREEN_CONTENT_PADDING_TOP,
  SCREEN_CONTENT_PADDING_BOTTOM,
  screenContentContainerStyle,
} from "@/utils/screen-layout";
import { POLICY_PAGES, SETTINGS_POLICY_LINKS } from "@/constants/policyPages";
import { href } from "@/navigation/href";

const SettingsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  const openPolicy = (policyId: (typeof SETTINGS_POLICY_LINKS)[number]) => {
    router.push({
      pathname: href.app.policyWebView,
      params: { policy: policyId },
    } as never);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090909" translucent />
      <View
        style={[styles.header, { paddingTop: topInset + 8 }]}
      >
        <PressableScale
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </PressableScale>
        <View style={styles.titleContainer}>
          <CustomText style={[headingTextStyles.h1, styles.titleText]}>
            Settings
          </CustomText>
        </View>
      </View>

      <AppScrollView
        contentContainerStyle={[
          screenContentContainerStyle,
          {
            paddingTop: 4,
            paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <CustomText style={styles.sectionTitle}>
          Legal & support
        </CustomText>
        <View style={styles.cardGroup}>
          {SETTINGS_POLICY_LINKS.map((policyId, index) => {
            const page = POLICY_PAGES[policyId];
            const isLast = index === SETTINGS_POLICY_LINKS.length - 1;
            return (
              <TouchableOpacity
                key={policyId}
                style={[
                  styles.rowItem,
                  !isLast && styles.rowItemBorder,
                ]}
                activeOpacity={0.7}
                onPress={() => openPolicy(policyId)}
              >
                <CustomText style={styles.rowItemTitle}>
                  {page.title}
                </CustomText>
                <CustomText style={styles.rowItemChevron}>
                  ›
                </CustomText>
              </TouchableOpacity>
            );
          })}
        </View>
      </AppScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090909",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
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
  sectionTitle: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  cardGroup: {
    backgroundColor: "#212121",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  rowItem: {
    minHeight: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  rowItemTitle: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  rowItemChevron: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "rgba(255, 255, 255, 0.7)",
  },
});

export default SettingsScreen;

