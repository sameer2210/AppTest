import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { ShimmerBox } from "@/components/ShimmerPlaceholder";
import { images } from "@/utils/images";
import { normalizeRemoteImageUri, resolveRasterImageUri } from "@/utils/resolveRemoteImageUri";

type Props = {
  uri?: string | null;
  fill?: boolean;
  /** When false, skip network fetch and keep the shimmer placeholder. */
  load?: boolean;
};

const ExploreEventImage = ({ uri, fill = true, load = true }: Props) => {
  const normalized = resolveRasterImageUri(uri) ?? normalizeRemoteImageUri(uri);
  const shouldLoad = Boolean(load && normalized);
  const [loading, setLoading] = useState(shouldLoad);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!shouldLoad) {
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
  }, [shouldLoad, normalized]);

  const showSkeleton = !shouldLoad || loading || failed;

  return (
    <View style={[styles.wrap, fill ? styles.fill : undefined]}>
      {showSkeleton ? (
        <>
          <Image
            source={images.MANAGED_EVENTS.INSIDE_EVENT_BANNER}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          {loading ? (
            <ShimmerBox
              width="100%"
              height="100%"
              borderRadius={0}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </>
      ) : null}
      {shouldLoad && !failed ? (
        <Image
          source={{ uri: normalized! }}
          style={[StyleSheet.absoluteFill, loading ? styles.hidden : undefined]}
          resizeMode="cover"
          // Defer decode work for off-path recycling; only visible cells set load=true.
          fadeDuration={0}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1A2940",
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  hidden: {
    opacity: 0,
  },
});

export default ExploreEventImage;
