import { View, Image, type ImageSourcePropType, StyleSheet } from "react-native";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { captureEvent } from "@/analytics/posthog/events";
import { images } from "@/utils/images";

type Props = {
  imageSource?: ImageSourcePropType;
  onPress: () => void;
};

export const FeelingLuckyCard = ({ imageSource, onPress }: Props) => {
  const source = imageSource || images.STEP_RACE.DICE;

  return (
    <View style={styles.card}>
      <View style={styles.leftContent}>
        <View style={styles.imageContainer}>
          <Image source={source} style={styles.image} resizeMode="contain" />
        </View>
        <View style={styles.textContainer}>
          <CustomText text="Feeling Lucky?" style={[fontTextStyles.medium, styles.title]} />
          <CustomText text="Race a Random Opponent" style={[fontTextStyles.regular, styles.subtitle]} />
        </View>
      </View>
      <PressableScale
        style={styles.startBtn}
        onPress={() => {
          captureEvent("feeling_lucky_tapped");
          onPress();
        }}
      >
        <CustomText text="Start Race" style={[fontTextStyles.semibold, styles.startBtnText]} />
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#191919",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 8,
  },
  imageContainer: {
    width: 66,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...fontTextStyles.eighteenBoldBlack,
    color: "#FFFFFF",
  },
  subtitle: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  startBtn: {
    borderRadius: 9999,
    backgroundColor: "#2A80FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startBtnText: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#FFFFFF",
  },
});
