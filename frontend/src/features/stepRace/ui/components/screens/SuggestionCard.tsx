import { useState } from "react";
import { View, Image, StyleSheet, type ImageSourcePropType } from "react-native";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { images } from "@/utils/images";

type Props = {
  name: string;
  subtext?: string;
  avatar: ImageSourcePropType;
  onPress: () => void;
};

export const SuggestionCard = ({ name, subtext, avatar, onPress }: Props) => {
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <Image
            source={failed ? images.HOME_V2.AVATAR_SAMPLE : avatar}
            style={styles.avatar}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        </View>
        <CustomText
          text={name}
          numberOfLines={1}
          style={[fontTextStyles.semibold, styles.name]}
        />
        {subtext ? (
          <CustomText
            text={subtext}
            numberOfLines={1}
            style={[fontTextStyles.regular, styles.subtext]}
          />
        ) : null}
      </View>
      <PressableScale
        style={styles.raceBtn}
        onPress={onPress}
      >
        <CustomText text="Tap to Race" style={[fontTextStyles.semibold, styles.raceBtnText]} />
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "31.5%",
    minHeight: 148,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: 10,
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  avatarContainer: {
    width: 51,
    height: 51,
    borderRadius: 26,
    overflow: "hidden",
    marginBottom: 6,
    backgroundColor: "#0D244F",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  name: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtext: {
    ...fontTextStyles.tenNormalBlack,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginTop: 2,
  },
  raceBtn: {
    borderRadius: 9999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    marginTop: 8,
  },
  raceBtnText: {
    ...fontTextStyles.tenBoldBlack,
    color: "rgba(0, 0, 0, 0.9)",
  },
});
