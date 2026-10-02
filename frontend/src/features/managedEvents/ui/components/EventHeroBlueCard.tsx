import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CustomText from "@/components/CustomText";
import EventFormatBanner, {
  EVENT_BANNER_TEMPLATE_ASPECT,
  shouldUseEventBannerTemplate,
} from "@/components/EventFormatBanner";
import type { StronEvent } from "@/models/stronManaged/event";
import { resolveEventBannerUri } from "@/utils/resolveRemoteImageUri";
import { images } from "@/utils/images";
import { captureEvent } from "@/analytics/posthog/events";

export type EventTab = "Overview" | "Leaderboard";

type Props = {
  title: string;
  subtitle?: string | null;
  bannerUri?: string | null;
  format?: StronEvent["format"] | string | null;
  listingType?: string | null;
  statusBadgeText: string;
  statusBadgeTextColor?: string;
  activeTab: EventTab;
  onTabChange: (tab: EventTab) => void;
  showLeaderboardTab?: boolean;
};

export const EventHeroBlueCard = ({
  title,
  subtitle,
  bannerUri,
  format,
  listingType,
  statusBadgeText,
  statusBadgeTextColor = "#2DE441",
  activeTab,
  onTabChange,
  showLeaderboardTab = true,
}: Props) => {
  const useTemplate = shouldUseEventBannerTemplate(format, listingType);
  const resolvedBanner =
    bannerUri && /^(https?:|file:|content:|data:)/i.test(bannerUri)
      ? bannerUri
      : resolveEventBannerUri(bannerUri) || bannerUri || null;

  const defaultBg =
    format === "face_off" ? images.MANAGED_EVENTS.FACE_OFF : images.MANAGED_EVENTS.KING_OF_THE_HILL;

  const displaySubtitle =
    subtitle && !subtitle.startsWith("__STRON_") ? subtitle : "Win most 1v1 step battles";

  return (
    <LinearGradient
      colors={["#005BFF", "#003EB8", "#031E56", "#020B22"]}
      locations={[0, 0.35, 0.7, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.card}
    >
      <View style={styles.bannerWrap}>
        {useTemplate ? (
          <EventFormatBanner
            format={format}
            logoUri={resolvedBanner}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            showUploadPlaceholder={false}
          />
        ) : resolvedBanner ? (
          <Image
            source={{ uri: resolvedBanner }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <Image source={defaultBg} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        )}

        {statusBadgeText ? (
          <View style={styles.badge}>
            <CustomText
              style={[
                styles.badgeText,
                {
                  color:
                    statusBadgeTextColor &&
                    statusBadgeTextColor.toLowerCase() !== "#ffffff" &&
                    statusBadgeTextColor.toLowerCase() !== "#fff"
                      ? statusBadgeTextColor
                      : "#000000",
                },
              ]}
            >
              {statusBadgeText}
            </CustomText>
          </View>
        ) : null}
      </View>

      <CustomText
        style={styles.title}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {title}
      </CustomText>
      <CustomText style={styles.subtitle}>{displaySubtitle}</CustomText>

      {showLeaderboardTab ? (
        <View style={styles.tabsTrack}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.tabButton,
              activeTab === "Overview" ? styles.tabButtonActive : styles.tabButtonInactive,
            ]}
            onPress={() => {
              captureEvent("event_detail_tab_switched", { tab: "Overview" });
              onTabChange("Overview");
            }}
          >
            <CustomText
              style={[
                styles.tabText,
                activeTab === "Overview" ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              Overview
            </CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.tabButton,
              activeTab === "Leaderboard" ? styles.tabButtonActive : styles.tabButtonInactive,
            ]}
            onPress={() => {
              captureEvent("event_detail_tab_switched", { tab: "Leaderboard" });
              onTabChange("Leaderboard");
            }}
          >
            <CustomText
              style={[
                styles.tabText,
                activeTab === "Leaderboard" ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              Leaderboard
            </CustomText>
          </TouchableOpacity>
        </View>
      ) : null}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 14,
  },
  bannerWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: EVENT_BANNER_TEMPLATE_ASPECT,
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  badge: {
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 10,
    height: 30,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 55,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    lineHeight: 32,
    color: "#FFFFFF",
  },
  subtitle: {
    marginBottom: 16,
    marginTop: 4,
    fontSize: 16,
    color: "#90B8FF",
  },
  tabsTrack: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 12,
  },
  tabButtonActive: {
    backgroundColor: "#000000",
  },
  tabButtonInactive: {
    backgroundColor: "transparent",
  },
  tabText: {
    fontSize: 16,
  },
  tabTextActive: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tabTextInactive: {
    color: "rgba(255, 255, 255, 0.7)",
  },
});

export default EventHeroBlueCard;
