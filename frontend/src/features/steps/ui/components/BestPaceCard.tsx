import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

type Props = {
  pace?: string;
  percentage?: string;
};

const parsePercentage = (pctStr?: string): number => {
  if (!pctStr) return 50;
  const match = pctStr.match(/(\d+)%/);
  if (match) {
    const val = parseInt(match[1], 10);
    if (pctStr.toLowerCase().includes("slower")) {
      return Math.max(10, 50 - Math.round(val / 2));
    }
    return Math.min(98, Math.max(15, val));
  }
  return 50;
};

/** Dynamic Best Pace card with progress ring calculated from pace data. */
const BestPaceCard = ({ pace = "04:21", percentage }: Props) => {
  const pct = parsePercentage(percentage);
  const circumference = 257.6; // 2 * Math.PI * 41
  const filledLength = (pct / 100) * circumference;
  const remainingLength = circumference - filledLength;

  return (
    <View style={styles.card}>
      <BlurView
        intensity={Platform.OS === "ios" ? 32 : 48}
        tint="dark"
        pointerEvents="none"
        style={styles.blur}
      />
      <View pointerEvents="none" style={styles.overlay} />

      <View style={styles.svgContainer}>
        <Svg width="106" height="115" viewBox="0 0 106 115" fill="none">
          <SvgText x="8" y="14" fill="#FFFFFF" fontSize="12" fontWeight="400">
            Best Pace
          </SvgText>

          {/* Background Track Circle */}
          <Circle cx="53" cy="64" r="41" stroke="#FFFFFF" strokeWidth="6" opacity={0.2} />

          {/* Dynamic Blue Progress Ring */}
          <Circle
            cx="53"
            cy="64"
            r="41"
            stroke="#2A80FF"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${filledLength.toFixed(1)} ${remainingLength.toFixed(1)}`}
            transform="rotate(-90 53 64)"
          />

          <SvgText
            x="53"
            y="61"
            fill="#FFFFFF"
            fontSize="17"
            fontWeight="700"
            fontStyle="italic"
            textAnchor="middle"
          >
            {pace}
          </SvgText>
          <SvgText
            x="53"
            y="74"
            fill="#FFFFFF"
            fontSize="10"
            fontStyle="italic"
            textAnchor="middle"
          >
            per 1k steps
          </SvgText>
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 115,
    width: 106,
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(93, 93, 93, 0.2)",
  },
  svgContainer: {
    zIndex: 10,
  },
});

export default BestPaceCard;
