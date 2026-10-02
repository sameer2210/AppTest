import { View, StyleSheet } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

type Props = {
  userSteps: number;
  opponentSteps: number;
  isLeading: boolean;
  userTimeSeconds?: number;
  targetSteps?: number;
};

export const ActiveRaceHero = ({
  userSteps,
  opponentSteps,
  isLeading,
  targetSteps = 1000,
}: Props) => {
  const diff = userSteps - opponentSteps;
  const formattedDiff = diff >= 0 ? `+${diff.toLocaleString()}` : `${diff.toLocaleString()}`;

  return (
    <View style={styles.container}>
      <CustomText
        text={`${targetSteps === 1000 ? "1K" : targetSteps} STEPS RACE`}
        style={[fontTextStyles.bold, styles.title]}
      />

      <View style={styles.leadSection}>
        <CustomText
          text={isLeading ? "YOUR LEAD" : "OPPONENT LEAD"}
          style={[
            fontTextStyles.bold,
            styles.leadBadge,
            { color: isLeading ? "#2DE441" : "#FF5C5C" },
          ]}
        />

        <View style={styles.stepsRow}>
          <CustomText
            text={formattedDiff}
            style={[
              fontTextStyles.bold,
              styles.diffText,
              { color: isLeading ? "#2DE441" : "#FF5C5C" },
            ]}
          />
          <CustomText
            text="steps"
            style={[fontTextStyles.bold, styles.unitText]}
          />
        </View>

        <CustomText
          text={isLeading ? "You're ahead right now!" : "You're trailing right now!"}
          style={[fontTextStyles.medium, styles.subtitle]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingHorizontal: 20,
  },
  title: {
    ...headingTextStyles.twentyFiveBoldBlack,
    color: "#FFFFFF",
  },
  leadSection: {
    marginTop: 12,
  },
  leadBadge: {
    ...fontTextStyles.sixteenBoldBlack,
    textTransform: "uppercase",
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 2,
  },
  diffText: {
    ...headingTextStyles.ninetyBoldBlack,
  },
  unitText: {
    ...headingTextStyles.size30BoldBlack,
    color: "#FFFFFF",
    marginLeft: 10,
  },
  subtitle: {
    ...fontTextStyles.eighteenMediumBlack,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
  },
});
