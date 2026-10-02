import { View, StyleSheet, useWindowDimensions } from "react-native";
import { ONBOARDING_ILLUSTRATIONS } from "../../../OnboardingIllustrations";

type Props = {
  index: number;
};

export const OnboardingSlideItem = ({ index }: Props) => {
  const { width, height } = useWindowDimensions();
  const Illustration = ONBOARDING_ILLUSTRATIONS[index];

  if (!Illustration) return null;
  const size = width * 0.8;

  return (
    <View style={[styles.slide, { width, height }]}>
      <View style={[styles.illustrationWrapper, { marginTop: height * 0.08 }]}>
        <Illustration width={size} height={size} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
  },
  illustrationWrapper: {
    alignItems: "center",
    width: "100%",
  },
});

