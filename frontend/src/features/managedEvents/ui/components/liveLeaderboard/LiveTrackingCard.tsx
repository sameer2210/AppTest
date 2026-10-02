import { StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";

type Props = {
  title?: string;
  subtitle?: string | null;
  currentLabel: string;
  targetLabel: string;
  progressPercent: number;
  /** `muted` = grey current (step challenge); `accent` = blue current (marathon). */
  currentTone?: "muted" | "accent";
};

/** White live progress card (marathon km / step challenge steps). */
const LiveTrackingCard = ({
  title = "Live Tracking",
  subtitle,
  currentLabel,
  targetLabel,
  progressPercent,
  currentTone = "muted",
}: Props) => {
  const clamped = Math.max(0, Math.min(100, Number(progressPercent) || 0));
  return (
    <View style={styles.card}>
      <CustomText style={styles.title}>{title}</CustomText>
      {subtitle ? (
        <CustomText style={styles.subtitle}>{subtitle}</CustomText>
      ) : null}
      <View style={styles.labelsRow}>
        <CustomText
          style={[
            styles.currentLabel,
            currentTone === "accent" ? styles.accentCurrentTone : styles.mutedCurrentTone,
          ]}
        >
          {currentLabel}
        </CustomText>
        <CustomText style={styles.targetLabel}>{targetLabel}</CustomText>
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${clamped}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  title: {
    fontSize: 22,
    color: "#000000",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 18,
  },
  labelsRow: {
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  currentLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  accentCurrentTone: {
    color: "#086CFF",
  },
  mutedCurrentTone: {
    color: "rgba(0, 0, 0, 0.45)",
  },
  targetLabel: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000000",
  },
  track: {
    height: 8,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: "#E5E5EA",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#086CFF",
  },
});

export default LiveTrackingCard;
