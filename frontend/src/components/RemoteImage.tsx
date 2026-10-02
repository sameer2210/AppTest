import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Image,
  StyleSheet,
  View,
  type ImageProps,
  type ImageStyle,
  type StyleProp,
} from "react-native";
import { SvgUri } from "react-native-svg";
import {
  isRemoteSvgUri,
  normalizeRemoteImageUri,
  resolveRasterImageUri,
} from "../utils/resolveRemoteImageUri";

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageProps["resizeMode"];
  onError?: () => void;
  fallback?: ReactNode;
};

const RemoteImage = ({ uri, style, resizeMode = "cover", onError, fallback = null }: Props) => {
  const normalized = normalizeRemoteImageUri(uri);
  const [useRasterFallback, setUseRasterFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  const isSvg = Boolean(normalized && isRemoteSvgUri(normalized) && !useRasterFallback);
  const rasterUri = useMemo(() => {
    if (!normalized) return undefined;
    if (isRemoteSvgUri(normalized)) {
      return useRasterFallback ? resolveRasterImageUri(normalized) : undefined;
    }
    return normalized;
  }, [normalized, useRasterFallback]);

  const flatStyle = useMemo(() => StyleSheet.flatten(style) ?? {}, [style]);
  const svgWidth =
    typeof flatStyle.width === "number" || typeof flatStyle.width === "string"
      ? flatStyle.width
      : "100%";
  const svgHeight =
    typeof flatStyle.height === "number" || typeof flatStyle.height === "string"
      ? flatStyle.height
      : "100%";

  useEffect(() => {
    setUseRasterFallback(false);
    setFailed(false);
  }, [normalized]);

  const handleFailure = () => {
    setFailed(true);
    onError?.();
  };

  const handleSvgError = () => {
    const fallbackUri = resolveRasterImageUri(normalized);
    if (fallbackUri) {
      setUseRasterFallback(true);
      return;
    }
    handleFailure();
  };

  if (!normalized || failed) {
    return fallback !== null ? <View style={style}>{fallback}</View> : null;
  }

  if (isSvg) {
    return (
      <View style={style}>
        <SvgUri width={svgWidth} height={svgHeight} uri={normalized} onError={handleSvgError} />
      </View>
    );
  }

  const imageUri = rasterUri ?? normalized;
  if (!imageUri) {
    return fallback !== null ? <View style={style}>{fallback}</View> : null;
  }

  return (
    <Image
      source={{ uri: imageUri }}
      style={style}
      resizeMode={resizeMode}
      onError={handleFailure}
    />
  );
};

export default RemoteImage;
