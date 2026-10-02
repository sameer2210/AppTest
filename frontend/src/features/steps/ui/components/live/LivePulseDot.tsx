import { memo, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type Props = {
  color?: string;
  size?: number;
};

/** Soft pulsing live indicator. */
const LivePulseDot = ({ color = "#FF4D4D", size = 8 }: Props) => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.7, { duration: 900, easing: Easing.out(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 2.2 - pulse.value,
  }));

  return (
    <View
      style={{
        width: size * 2.2,
        height: size * 2.2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[
          styles.halo,
          haloStyle,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  halo: {
    position: "absolute",
  },
});

export default memo(LivePulseDot);
