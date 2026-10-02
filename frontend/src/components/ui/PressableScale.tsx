import { Pressable, type PressableProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { PRESS_SCALE, SPRING_IOS } from "@/utils/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  className?: string;
  scale?: number;
};

const PressableScale = ({
  className,
  scale = PRESS_SCALE,
  children,
  onPressIn,
  onPressOut,
  style,
  ...props
}: Props) => {
  const pressed = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressed.value }],
  }));

  return (
    <AnimatedPressable
      className={className}
      {...props}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        pressed.value = withSpring(scale, SPRING_IOS);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withSpring(1, SPRING_IOS);
        onPressOut?.(event);
      }}
    >
      {children}
    </AnimatedPressable>
  );
};

export default PressableScale;
