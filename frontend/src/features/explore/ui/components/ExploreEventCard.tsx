import { memo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { href } from "@/navigation/href";
import CustomText from "@/components/CustomText";
import ExploreEventImage from "./ExploreEventImage";
import EventFormatBanner, { shouldUseEventBannerTemplate } from "@/components/EventFormatBanner";
import { fontTextStyles } from "@/utils/typography";
import type { StronEvent } from "@/models/stronManaged/event";
import { captureEvent } from "@/analytics/posthog/events";

interface ExploreEventCardProps {
  id?: string;
  eventType?: string;
  imageUrl?: string;
  title: string;
  date: string;
  price: string;
  category?: string;
  subtitle?: string;
  location?: string;
  rating?: string;
  eventKey?: string;
  organizerUid?: string;
  isExternal?: boolean;
  listingType?: string;
  format?: StronEvent["format"] | string;
  /** When false, banner URI is not requested (placeholder only). */
  loadImage?: boolean;
}

const ExploreEventCard = memo(
  ({
    imageUrl,
    title,
    date,
    price,
    category,
    subtitle,
    location,
    eventKey,
    isExternal,
    listingType,
    format,
    loadImage = true,
  }: ExploreEventCardProps) => {
    const router = useRouter();
    const priceLabel =
      price === "Ended"
        ? "Ended"
        : price === "Closed"
          ? "Closed"
          : isExternal || price === "Register"
            ? "Register"
            : price === "Free" || price.toLowerCase().includes("free")
              ? "Free"
              : `₹${price.replace(/\D/g, "")}`;

    const showStartsFrom =
      priceLabel !== "Register" &&
      priceLabel !== "Free" &&
      priceLabel !== "Ended" &&
      priceLabel !== "Closed";

    const openEvent = () => {
      captureEvent("explore_card_tapped", { event_key: eventKey, section: category });
      if (eventKey) {
        router.push({
          pathname: href.app.stronEvent,
          params: { key: eventKey },
        } as never);
        return;
      }
      router.push({ pathname: "/event-details", params: { category } } as never);
    };

    const metaLocation = (location || "").trim();
    const metaDate = (date || "").trim();

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={openEvent}
        style={styles.card}
      >
        <View style={styles.thumb}>
          {shouldUseEventBannerTemplate(format, isExternal ? "external" : listingType) ? (
            <EventFormatBanner
              format={format}
              logoUri={imageUrl}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              showUploadPlaceholder={false}
              alwaysShowLogoCircle
            />
          ) : (
            <ExploreEventImage uri={imageUrl} load={true} />
          )}
        </View>

        <View style={styles.content}>
          <View>
            <CustomText style={styles.title} numberOfLines={1}>
              {title}
            </CustomText>
            <CustomText style={styles.subtitle} numberOfLines={1}>
              {subtitle || category || "Event"}
            </CustomText>
            {metaLocation || metaDate ? (
              <View style={styles.metaRow}>
                {metaLocation ? (
                  <CustomText style={styles.metaText} numberOfLines={1}>
                    {metaLocation}
                  </CustomText>
                ) : null}
                {metaLocation && metaDate ? (
                  <View style={styles.dot} />
                ) : null}
                {metaDate ? (
                  <CustomText style={styles.metaText} numberOfLines={1}>
                    {metaDate}
                  </CustomText>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.priceRow}>
            {showStartsFrom ? (
              <CustomText style={styles.startsFrom}>Starts from </CustomText>
            ) : null}
            <CustomText style={styles.price}>{priceLabel}</CustomText>
          </View>
        </View>

        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  },
);

ExploreEventCard.displayName = "ExploreEventCard";

const styles = StyleSheet.create({
  card: {
    position: "relative",
    marginBottom: 10,
    height: 100,
    width: "100%",
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "rgba(25, 25, 25, 0.2)",
  },
  thumb: {
    width: 177,
    height: "100%",
    backgroundColor: "#000000",
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 8,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 32,
  },
  title: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#FFFFFF",
  },
  subtitle: {
    ...fontTextStyles.twelveNormalBlack,
    color: "#A7A7A7",
    marginTop: 2,
  },
  metaRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "#A7A7A7",
  },
  dot: {
    marginHorizontal: 6,
    height: 3,
    width: 3,
    borderRadius: 2,
    backgroundColor: "#A7A7A7",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  startsFrom: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "#FFFFFF",
  },
  price: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#FFFFFF",
  },
  chevronWrap: {
    position: "absolute",
    bottom: 12,
    right: 12,
  },
});

export default ExploreEventCard;
