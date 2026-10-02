import React from "react";
import { View, StyleSheet } from "react-native";
import CustomText from "@/components/CustomText";
import { PressableScale } from "@/components/ui";

interface OrganizerStatusCardProps {
  title?: string;
  isCancelled: boolean;
  isCompleted: boolean;
  isSoldOut: boolean;
  isLive: boolean;
  isTicketSaleStopped: boolean;
  rawStatus?: string;
  shortDateRange: string;
  startingPriceLabel: string;
  onOpenStartSale: () => void;
  onOpenStopSale: () => void;
  onOpenCancel: () => void;
  onOpenDelete: () => void;
}

export const OrganizerStatusCard = React.memo(
  ({
    title,
    isCancelled,
    isCompleted,
    isSoldOut,
    isLive,
    isTicketSaleStopped,
    rawStatus,
    shortDateRange,
    startingPriceLabel,
    onOpenStartSale,
    onOpenStopSale,
    onOpenCancel,
    onOpenDelete,
  }: OrganizerStatusCardProps) => {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <CustomText
            style={styles.title}
            numberOfLines={3}
          >
            {title || "Alpha Contest"}
          </CustomText>

          <View style={styles.statusWrap}>
            {isCancelled ? (
              <CustomText style={[styles.statusText, styles.dangerText]}>
                CANCELLED
              </CustomText>
            ) : isCompleted ? (
              <CustomText style={styles.statusText}>
                COMPLETED
              </CustomText>
            ) : isSoldOut ? (
              <CustomText style={[styles.statusText, styles.dangerText]}>
                SOLD OUT
              </CustomText>
            ) : isLive ? (
              <CustomText
                style={[
                  styles.statusText,
                  isTicketSaleStopped ? styles.dangerText : styles.liveText,
                ]}
              >
                {isTicketSaleStopped ? "CLOSED" : "STARTED"}
              </CustomText>
            ) : (
              <CustomText style={styles.statusText}>
                {(rawStatus || "DRAFT").toUpperCase()}
              </CustomText>
            )}
          </View>
        </View>

        <CustomText style={styles.dateText}>{shortDateRange}</CustomText>
        <CustomText style={styles.priceText}>
          {startingPriceLabel}
        </CustomText>

        {isCancelled || isCompleted ? null : (
          <View style={styles.actionsRow}>
            {isTicketSaleStopped ? (
              <PressableScale
                onPress={onOpenStartSale}
                style={styles.actionBtn}
              >
                <CustomText style={[styles.actionBtnText, styles.startSaleText]}>
                  Continue Ticket Sale
                </CustomText>
              </PressableScale>
            ) : (
              <PressableScale
                onPress={onOpenStopSale}
                style={styles.actionBtn}
              >
                <CustomText style={[styles.actionBtnText, styles.stopSaleText]}>
                  Stop Ticket Sale
                </CustomText>
              </PressableScale>
            )}
            <PressableScale
              onPress={isLive || isSoldOut ? onOpenCancel : onOpenDelete}
              style={styles.linkBtn}
            >
              <CustomText style={styles.linkBtnText}>
                {isLive || isSoldOut ? "Cancel Event" : "Delete Event"}
              </CustomText>
            </PressableScale>
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: "#191919",
    padding: 18,
  },
  headerRow: {
    marginBottom: 4,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    paddingRight: 12,
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statusWrap: {
    flexShrink: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  dangerText: {
    color: "#FF5151",
  },
  liveText: {
    color: "#00FF66",
  },
  dateText: {
    marginTop: 4,
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.6)",
  },
  priceText: {
    marginTop: 4,
    marginBottom: 14,
    fontSize: 14,
    color: "#FFFFFF",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
  },
  actionBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#424242",
    backgroundColor: "#292929",
    paddingHorizontal: 16,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "500",
  },
  startSaleText: {
    color: "#00FF66",
  },
  stopSaleText: {
    color: "#FF5151",
  },
  linkBtn: {
    justifyContent: "center",
    paddingVertical: 8,
  },
  linkBtnText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FF5151",
    textDecorationLine: "underline",
  },
});

export default OrganizerStatusCard;
