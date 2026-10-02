import { Image, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import type { StronTicketType } from "@/models/stronManaged/event";
import { formatTicketBenefits } from "../../../shared/formatters";
import { formatTicketPriceLabel, isFreeTicket } from "@/utils/stronFreeTicket";

type Props = {
  ticket: StronTicketType;
  expanded: boolean;
  onToggle: () => void;
  capacityHint?: string;
  /** Opens ticket editor (organizer ticket-only edits). */
  onEditTicket?: () => void;
  /** Participant buy CTA label, e.g. "Buy Now" / "Sold Out". */
  actionLabel?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  soldOut?: boolean;
  /** Hide ₹ price (external listing register flow). */
  hidePrice?: boolean;
  /** Force Free label (event-level free markers / apidev ₹1 placeholders). */
  forceFree?: boolean;
};

export const TicketExpandRow = ({
  ticket,
  expanded,
  onToggle,
  capacityHint,
  onEditTicket,
  actionLabel,
  actionDisabled,
  onAction,
  soldOut,
  hidePrice,
  forceFree,
}: Props) => {
  const benefits = formatTicketBenefits(ticket);
  const priceText = forceFree || isFreeTicket(ticket) ? "Free" : formatTicketPriceLabel(ticket);

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={[
        styles.row,
        expanded ? styles.rowExpanded : styles.rowCollapsed,
        soldOut && styles.rowSoldOut,
      ]}
    >
      <PressableScale onPress={onToggle} style={styles.press}>
        <View style={styles.priceRow}>
          {hidePrice ? (
            <CustomText
              style={[
                fontTextStyles.twentyMediumBlack,
                { color: soldOut ? "rgba(217,217,217,0.45)" : "#D9D9D9" },
              ]}
            >
              {ticket.label || "External Registration"}
            </CustomText>
          ) : (
            <CustomText
              style={[
                fontTextStyles.size24MediumBlack,
                { color: soldOut ? "rgba(217,217,217,0.45)" : "#D9D9D9" },
              ]}
            >
              {priceText}
            </CustomText>
          )}
          {soldOut ? (
            <View style={styles.soldPill}>
              <CustomText style={[fontTextStyles.twelveNormalBlack, { color: "#FF6B6B" }]}>Sold Out</CustomText>
            </View>
          ) : null}
        </View>

        {expanded ? (
          <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(140)}>
            {capacityHint ? (
              <CustomText style={[fontTextStyles.twelveNormalBlack, { color: "#D9D9D9", marginTop: 4 }]}>
                {capacityHint}
              </CustomText>
            ) : null}
            <CustomText style={[fontTextStyles.twelveNormalBlack, { color: "rgba(255,255,255,0.75)", marginTop: 8 }]}>
              {benefits}
              {onEditTicket ? (
                <>
                  {" · "}
                  <CustomText style={{ color: "#71BAFF" }} onPress={onEditTicket}>
                    Edit
                  </CustomText>
                </>
              ) : null}
            </CustomText>
            {actionLabel ? (
              <PressableScale
                onPress={onAction}
                disabled={actionDisabled || soldOut}
                style={[styles.actionBtn, (actionDisabled || soldOut) && styles.actionDisabled]}
                accessibilityRole="button"
              >
                <CustomText style={[fontTextStyles.fourteenNormalBlack, { color: "#D9D9D9" }]}>
                  {soldOut ? "Sold Out" : actionLabel}
                </CustomText>
              </PressableScale>
            ) : (
              <CustomText style={[fontTextStyles.sixteenNormalBlack, { color: "#71BAFF", alignSelf: "flex-end", marginTop: 12 }]}>
                See less
              </CustomText>
            )}
          </Animated.View>
        ) : (
          <View style={styles.collapsedMeta}>
            <CustomText style={[fontTextStyles.twelveNormalBlack, { color: "#71BAFF" }]}>
              See More
              {capacityHint ? <CustomText style={{ color: "#D9D9D9" }}>{`, ${capacityHint}`}</CustomText> : null}
            </CustomText>
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
};

type StackProps = {
  avatars?: string[];
  countLabel: string;
};

export const ParticipantStatCard = ({ avatars = [], countLabel }: StackProps) => {
  const isZero = countLabel === "0" || !countLabel;

  return (
    <View style={styles.statCard}>
      <View style={styles.statTop}>
        <CustomText
          style={[
            isZero ? fontTextStyles.twentyMediumBlack : fontTextStyles.thirtyTwoBoldBlack,
            { color: "#D9D9D9" },
          ]}
        >
          {isZero ? "No participants" : countLabel}
        </CustomText>
        {!isZero && (
          <View style={styles.avatarStack}>
            {(avatars.length ? avatars : ["", "", "", ""]).slice(0, 4).map((uri, i) => (
              <View
                key={`av-${i}`}
                style={[styles.avatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i }]}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback} />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
      {!isZero && (
        <CustomText style={[fontTextStyles.fourteenNormalBlack, { color: "rgba(255,255,255,0.5)" }]}>
          Users Participated
        </CustomText>
      )}
    </View>
  );
};

export const StartTimeStatCard = ({ timeLabel }: { timeLabel: string }) => (
  <View style={styles.statCard}>
    <CustomText
      style={[fontTextStyles.thirtyTwoBoldBlack, { color: "#D9D9D9" }]}
      numberOfLines={1}
    >
      {timeLabel}
    </CustomText>
    <CustomText style={[fontTextStyles.fourteenNormalBlack, { color: "rgba(255,255,255,0.5)", marginTop: 4 }]}>
      The event will Start
    </CustomText>
  </View>
);

const styles = StyleSheet.create({
  row: {
    backgroundColor: "#191919",
    overflow: "hidden",
  },
  rowExpanded: {
    borderRadius: 16,
    minHeight: 156,
  },
  rowCollapsed: {
    borderRadius: 54,
    minHeight: 66,
  },
  rowSoldOut: {
    opacity: 0.72,
  },
  press: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  soldPill: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,107,107,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  collapsedMeta: {
    marginTop: 4,
  },
  actionBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 40,
    backgroundColor: "#086CFF",
    alignItems: "center",
    justifyContent: "center",
  },
  actionDisabled: {
    opacity: 0.45,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#191919",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 70,
    justifyContent: "center",
  },
  statTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#191919",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    flex: 1,
    backgroundColor: "#3A3A3A",
  },
});

export default TicketExpandRow;
