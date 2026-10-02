import { memo } from "react";
import { Image, StyleSheet, View } from "react-native";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { images } from "@/utils/images";
import { eventLooksFree, minPaidTicketPrice } from "@/utils/stronFreeTicket";
import { resolveEventBannerUri } from "@/utils/resolveRemoteImageUri";
import EventFormatBanner, { shouldUseEventBannerTemplate } from "@/components/EventFormatBanner";
import { formatEventProgressData, type ManagedActivityItem } from "@/features/managedEvents";
import type { StronEvent } from "@/models/stronManaged/event";

export type ActivityItem = ManagedActivityItem;

export type FeedListing = { listingType?: string; description?: string };

/** Discriminated union rendered by the home feed FlatList — see HomeScreenContent. */
export type FeedItem =
  | { type: "official"; key: string; date: number; data: StronEvent }
  | { type: "personal"; key: string; date: number; data: ActivityItem };

const FORMAT_LABEL: Record<StronEvent["format"], string> = {
  marathon: "Marathon",
  virtual_step_challenge: "Step Challenge",
  king_of_the_hill: "King of the Hill",
  face_off: "Face-Off",
};

const formatShortDate = (iso?: string | null) => {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const statusBadge = (status: StronEvent["status"] | string) => {
  if (status === "live") return "Live";
  if (status === "published") return "Open";
  if (status === "completed" || status === "settled") return "Done";
  return String(status);
};

const renderBannerImage = (
  bannerName?: string | null,
  format?: string | null,
  listingType?: string | null,
  description?: string | null,
) => {
  if (shouldUseEventBannerTemplate(format, listingType, description)) {
    return (
      <EventFormatBanner
        format={format}
        bannerName={bannerName}
        style={styles.banner}
        resizeMode="cover"
        showUploadPlaceholder={false}
      />
    );
  }
  const uri = resolveEventBannerUri(bannerName);
  return (
    <Image
      source={uri ? { uri } : images.HOME_V2.FOREST}
      style={styles.banner}
      resizeMode="cover"
      resizeMethod="resize"
      fadeDuration={0}
    />
  );
};

type CatalogCardProps = { event: StronEvent; onPress: (key: string) => void };

export const CatalogCard = memo(({ event, onPress }: CatalogCardProps) => {
  const priceLabel = eventLooksFree(event)
    ? "Free"
    : (() => {
        const minPaid = minPaidTicketPrice(event.ticketTypes);
        return minPaid > 0 ? `₹${minPaid}` : "Free";
      })();

  return (
    <View style={styles.cardWrapper}>
      <PressableScale onPress={() => onPress(event.key)}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerInfo}>
              <CustomText style={styles.formatText}>
                {FORMAT_LABEL[event.format] || event.format}
              </CustomText>
              <CustomText style={styles.destinationText}>
                {event.destination || "Virtual"} · {formatShortDate(event.startDate)}
              </CustomText>
            </View>
            <View style={styles.badge}>
              <CustomText style={styles.badgeText}>{statusBadge(event.status)}</CustomText>
            </View>
          </View>
          {renderBannerImage(event.bannerName, event.format, event.listingType, event.description)}
          <View style={styles.body}>
            <CustomText style={styles.title}>{event.title}</CustomText>
            <View style={styles.metaRow}>
              <CustomText style={styles.metaText}>
                {event.registrationCount ?? 0} joined
              </CustomText>
              <Image
                source={images.HOME_V2.DOT}
                style={styles.dot}
                resizeMode="contain"
                tintColor="rgba(255,255,255,0.6)"
              />
              <CustomText style={styles.metaText}>{priceLabel}</CustomText>
            </View>
          </View>
        </View>
      </PressableScale>
    </View>
  );
});
CatalogCard.displayName = "CatalogCard";

type ActivityCardProps = {
  item: ActivityItem;
  listing?: FeedListing;
  onPress: (key: string) => void;
};

export const ActivityCard = memo(({ item, listing, onPress }: ActivityCardProps) => {
  const formatKey = item.format as StronEvent["format"];
  const formatLabel = FORMAT_LABEL[formatKey] || item.tag || "Event";
  const prices = Array.isArray(item.ticketTypes)
    ? item.ticketTypes.map((t) => Number(t.price) || 0).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const priceLabel = prices.length > 0 ? `₹${Math.min(...prices)}` : "Free";
  const progressText = formatEventProgressData(item);

  return (
    <View style={styles.cardWrapper}>
      <PressableScale onPress={() => onPress(item.eventKey)}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerInfo}>
              <CustomText style={styles.formatText}>{formatLabel}</CustomText>
              <CustomText style={styles.destinationText}>
                {item.destination || "Virtual"} · {formatShortDate(item.startDate)}
              </CustomText>
            </View>
            <View style={styles.badge}>
              <CustomText style={styles.badgeText}>{item.actionLabel}</CustomText>
            </View>
          </View>
          {renderBannerImage(
            item.bannerName,
            item.format,
            listing?.listingType ?? item.listingType,
            listing?.description,
          )}
          <View style={styles.body}>
            <CustomText style={styles.title}>{item.title}</CustomText>
            <View style={styles.metaRow}>
              <CustomText style={styles.metaText}>
                {item.registrationCount ?? 0} joined
              </CustomText>
              <Image
                source={images.HOME_V2.DOT}
                style={styles.dot}
                resizeMode="contain"
                tintColor="rgba(255,255,255,0.6)"
              />
              <CustomText style={styles.metaText}>{priceLabel}</CustomText>
            </View>
            {progressText ? (
              <CustomText style={styles.progressText}>{progressText}</CustomText>
            ) : null}
          </View>
        </View>
      </PressableScale>
    </View>
  );
});
ActivityCard.displayName = "ActivityCard";

type EmptyStateProps = { onBrowseExplore: () => void };

export const FeedEmptyState = memo(({ onBrowseExplore }: EmptyStateProps) => (
  <View style={styles.emptyState}>
    <CustomText style={styles.emptyText}>
      No events yet. Browse Explore to find races and challenges to join.
    </CustomText>
    <PressableScale
      onPress={onBrowseExplore}
      style={styles.emptyBtn}
    >
      <CustomText style={styles.emptyBtnText}>Open Explore</CustomText>
    </PressableScale>
  </View>
));
FeedEmptyState.displayName = "FeedEmptyState";

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    height: 140,
    backgroundColor: "#1A2940",
  },
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#212121",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerInfo: {
    flex: 1,
    paddingRight: 8,
  },
  formatText: {
    ...fontTextStyles.headingSmall,
    fontSize: 16,
    color: "#FFFFFF",
  },
  destinationText: {
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  badge: {
    borderRadius: 9999,
    backgroundColor: "#1670FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    ...fontTextStyles.buttonText,
    fontSize: 14,
    color: "#FFFFFF",
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  title: {
    ...fontTextStyles.headingSmall,
    fontSize: 20,
    color: "#FFFFFF",
  },
  metaRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    ...fontTextStyles.bodySmall,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  dot: {
    width: 4,
    height: 4,
  },
  progressText: {
    ...fontTextStyles.bodySmall,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 4,
  },
  emptyState: {
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: "#212121",
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  emptyText: {
    ...fontTextStyles.bodySmall,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  emptyBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 9999,
    backgroundColor: "#1670FF",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  emptyBtnText: {
    ...fontTextStyles.buttonText,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
