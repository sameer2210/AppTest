import React, { useState } from "react";
import { Image, type ImageSourcePropType, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

type Props = {
  title: string;
  description: string;
  onPress: () => void;
  illustration: ImageSourcePropType;
  illustrationStyle?: object;
  accessibilityLabel?: string;
  fallbackGlyph?: keyof typeof Ionicons.glyphMap;
};

/** Figma 1423:147 — blue format tile with watermark art + description. */
const ChallengeFormatCard: React.FC<Props> = React.memo(({
  title,
  description,
  onPress,
  illustration,
  illustrationStyle,
  accessibilityLabel,
  fallbackGlyph,
}: Props) => {
  const [imageError, setImageError] = useState(false);

  return (
    <PressableScale
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      <View pointerEvents="none" style={styles.artClip}>
        {!imageError && illustration ? (
          <Image
            source={illustration}
            style={[styles.art, illustrationStyle]}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        ) : fallbackGlyph ? (
          <View style={styles.glyphContainer}>
            <Ionicons name={fallbackGlyph} size={38} color="rgba(255, 255, 255, 0.85)" />
          </View>
        ) : null}
      </View>

      <View style={styles.copy}>
        <CustomText style={styles.title} numberOfLines={2}>
          {title}
        </CustomText>
        <CustomText style={styles.description} numberOfLines={3}>
          {description}
        </CustomText>
      </View>
    </PressableScale>
  );
});

ChallengeFormatCard.displayName = "ChallengeFormatCard";

const styles = StyleSheet.create({
  card: {
    width: "100%",
    height: 142,
    borderRadius: 18,
    backgroundColor: "#086CFF",
    paddingHorizontal: 12,
    paddingBottom: 14,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  copy: {
    zIndex: 2,
  },
  title: {
    ...fontTextStyles.twentyFourMediumBlack,
    color: "#FFFFFF",
  },
  description: {
    marginTop: 2,
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  artClip: {
    ...StyleSheet.absoluteFillObject,
  },
  art: {
    position: "absolute",
    opacity: 0.85,
    right: 4,
    top: 4,
    width: 80,
    height: 80,
  },
  glyphContainer: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ChallengeFormatCard;

