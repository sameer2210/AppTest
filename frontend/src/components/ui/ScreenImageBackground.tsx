import { Dimensions, Image, StyleSheet, View, type ImageSourcePropType } from "react-native";

type Props = {
  source: ImageSourcePropType;
  /** Extend behind status bar and home indicator (default true). */
  edgeToEdge?: boolean;
  /** Flip vertically — matches home screen background. */
  flipY?: boolean;
  /** Rotate image (e.g. '180deg'). */
  rotate?: string;
};

/** Full-screen cover background image — fills the physical display. */
const ScreenImageBackground = ({ source, flipY = false, rotate }: Props) => {
  const { width, height } = Dimensions.get("screen");

  const transforms: any[] = [];
  if (flipY) transforms.push({ scaleY: -1 });
  if (rotate) transforms.push({ rotate });

  const style = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width,
    height,
    ...(transforms.length > 0 ? { transform: transforms } : {}),
  };

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Image source={source} style={style} resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
};

export default ScreenImageBackground;
