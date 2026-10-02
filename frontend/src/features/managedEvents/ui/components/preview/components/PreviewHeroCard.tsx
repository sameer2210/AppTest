import { Image, StyleSheet, View } from "react-native";
import { fontTextStyles } from "@/utils/typography";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import EventFormatBanner, {
  EVENT_BANNER_TEMPLATE_ASPECT,
  shouldUseEventBannerTemplate,
} from "@/components/EventFormatBanner";
import type { StronEvent } from "@/models/stronManaged/event";
import { resolveEventBannerUri } from "@/utils/resolveRemoteImageUri";
import { images } from "@/utils/images";
import PreviewSegmentTabs, { type PreviewTab } from "./PreviewSegmentTabs";

export type BadgeTone =
  "default" | "danger" | "live" | "started" | "completed" | "closed" | "sold_out" | "warning";

type Props = {
  dateLabel: string;
  bannerUri?: string | null;
  format?: StronEvent["format"] | string | null;
  listingType?: string | null;
  isLive?: boolean;
  /** Overrides Live badge — e.g. "Day 1/7", "Completed", "Sold Out", "Closed", "Cancelled". */
  statusBadge?: string | null;
  statusBadgeTone?: BadgeTone;
  tabs?: PreviewTab[];
  activeTab?: PreviewTab;
  onTabChange?: (tab: PreviewTab) => void;
  onUploadPress?: () => void;
  showUpload?: boolean;
  /** Hide Overview/Tickets segment row (duel buy / single-scroll live). */
  hideTabs?: boolean;
  titleOverride?: string | null;
};

const getBadgeColors = (tone: BadgeTone) => {
  switch (tone) {
    case "live":
    case "danger":
      return { bg: "#E53935", text: "#FFFFFF" };
    case "started":
      return { bg: "#2DE441", text: "#000000" };
    case "sold_out":
    case "warning":
      return { bg: "#FF9800", text: "#FFFFFF" };
    case "completed":
      return { bg: "#455A64", text: "#FFFFFF" };
    case "closed":
      return { bg: "#37474F", text: "rgba(255,255,255,0.7)" };
    default:
      return { bg: "#FFFFFF", text: "#000000" };
  }
};

/** Dark hero — banner, date, segment tabs (Figma 1:3833 / 1:2). */
const PreviewHeroCard = ({
  dateLabel,
  bannerUri,
  format,
  listingType,
  isLive,
  statusBadge,
  statusBadgeTone = "default",
  tabs = [],
  activeTab,
  onTabChange,
  onUploadPress,
  showUpload = false,
  hideTabs = false,
  titleOverride,
}: Props) => {
  const badge = statusBadge || (isLive ? "Live" : null);
  const useTemplate = shouldUseEventBannerTemplate(format, listingType);
  const resolvedBanner =
    bannerUri && /^(https?:|file:|content:|data:)/i.test(bannerUri)
      ? bannerUri
      : resolveEventBannerUri(bannerUri) || bannerUri || null;
  const hasLogo = Boolean(resolvedBanner?.trim());
  /** Organizer-only: empty ring shows Upload Logo (never for participants). */
  const organizerCanUploadLogo = Boolean(showUpload && !hasLogo);

  const badgeColors = getBadgeColors(statusBadgeTone);

  return (
    <LinearGradient
      colors={["#2A2A2C", "#1A1A1C", "#121212", "#0B0C0E"]}
      locations={[0, 0.35, 0.7, 1]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0.15, y: 1 }}
      style={styles.card}
    >
      <View style={styles.bannerWrap}>
        {useTemplate ? (
          <EventFormatBanner
            format={format}
            logoUri={resolvedBanner}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            showUploadPlaceholder={organizerCanUploadLogo}
            onUploadPress={organizerCanUploadLogo ? onUploadPress : undefined}
          />
        ) : resolvedBanner ? (
          <Image
            source={{ uri: resolvedBanner }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={images.MANAGED_EVENTS.INSIDE_EVENT_BANNER}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        )}
        {badge ? (
          <View
            style={[styles.liveBadge, styles.liveBadgeRight, { backgroundColor: badgeColors.bg }]}
          >
            <CustomText style={[styles.badgeText, { color: badgeColors.text }]}>
              {badge}
            </CustomText>
          </View>
        ) : null}
        {/* Non-template events: pill CTA (template uses circle "Upload Logo" instead) */}
        {organizerCanUploadLogo && !useTemplate ? (
          <PressableScale
            onPress={onUploadPress}
            style={styles.uploadPill}
            accessibilityRole="button"
          >
            <CustomText style={styles.uploadText}>Upload Banner</CustomText>
            <View style={styles.uploadIcon}>
              <Ionicons name="arrow-up" size={12} color="#086CFF" />
            </View>
          </PressableScale>
        ) : null}
      </View>

      {titleOverride ? (
        <CustomText style={styles.titleOverrideText}>{titleOverride}</CustomText>
      ) : null}
      <CustomText
        style={[
          titleOverride ? styles.dateUnderTitle : styles.dateAlone,
          styles.dateLabelBase,
          titleOverride ? styles.dateLabelWithTitle : styles.dateLabelWithoutTitle,
        ]}
      >
        {dateLabel}
      </CustomText>

      {!hideTabs && tabs && tabs.length > 0 && activeTab && onTabChange ? (
        <PreviewSegmentTabs tabs={tabs} active={activeTab} onChange={onTabChange} />
      ) : null}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
  bannerWrap: {
    position: "relative",
    borderRadius: 23,
    overflow: "hidden",
    width: "100%",
    aspectRatio: EVENT_BANNER_TEMPLATE_ASPECT,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  bannerPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  liveBadge: {
    position: "absolute",
    top: 10,
    height: 26,
    minWidth: 79,
    paddingHorizontal: 18,
    borderRadius: 55,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  liveBadgeRight: {
    right: 10,
  },
  liveBadgeLeft: {
    left: 10,
  },
  uploadPill: {
    position: "absolute",
    right: 10,
    bottom: 10,
    height: 28,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: 42,
    backgroundColor: "rgba(0,0,0,0.35)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 2,
  },
  uploadIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  dateAlone: {
    ...fontTextStyles.thirtyFourNormalBlack,
    marginTop: 12,
  },
  dateUnderTitle: {
    ...fontTextStyles.twentyFourNormalBlack,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  uploadText: {
    fontSize: 14,
    color: "#D9D9D9",
  },
  titleOverrideText: {
    marginTop: 12,
    fontSize: 32,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  dateLabelBase: {
    fontWeight: "500",
    color: "#D9D9D9",
  },
  dateLabelWithTitle: {
    marginBottom: 4,
    fontSize: 20,
  },
  dateLabelWithoutTitle: {
    marginBottom: 12,
    fontSize: 32,
  },
});

export default PreviewHeroCard;
