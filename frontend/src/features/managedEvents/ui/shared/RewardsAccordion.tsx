import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import type { StronEvent } from "@/models/stronManaged/event";
import { resolveEventRewardLabels } from "../shared/eventRewards";

type Props = {
  event: StronEvent;
  /** When true, section starts expanded (Bug 28). */
  defaultOpen?: boolean;
  /** Hide the whole section when there are no reward labels (default true). */
  hideWhenEmpty?: boolean;
};

/** Expandable Rewards row with white-pill labels. */
export const RewardsAccordion = ({ event, defaultOpen = true, hideWhenEmpty = true }: Props) => {
  const [open, setOpen] = useState(defaultOpen);
  const labels = resolveEventRewardLabels(event);

  if (hideWhenEmpty && labels.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <PressableScale
        style={styles.header}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
      >
        <CustomText style={styles.titleText}>Rewards</CustomText>
        <CustomText style={styles.arrowText}>{open ? "▴" : "▾"}</CustomText>
      </PressableScale>
      {open ? (
        <View style={styles.pillsRow}>
          {labels.length === 0 ? (
            <CustomText style={styles.emptyText}>No rewards listed.</CustomText>
          ) : (
            labels.map((label) => (
              <View key={label} style={styles.pill}>
                <CustomText style={styles.pillText}>{label}</CustomText>
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 54,
    backgroundColor: "#191919",
    overflow: "hidden",
    paddingBottom: 4,
  },
  header: {
    height: 66,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleText: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "#D9D9D9",
  },
  arrowText: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "#D9D9D9",
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  emptyText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.5)",
  },
  pill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "#111111",
  },
});

export default RewardsAccordion;

