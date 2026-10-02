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

export const OpponentResultCard = ({ name, subtext, avatar, onPress }: Props) => {
  const [failed, setFailed] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.leftContent}>
        <View style={styles.avatarContainer}>
          <Image
            source={failed ? images.HOME_V2.AVATAR_SAMPLE : avatar}
            style={styles.avatar}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        </View>
        <View style={styles.nameContainer}>
          <CustomText text={name} style={[fontTextStyles.semibold, styles.name]} />
          {subtext ? (
            <CustomText text={subtext} style={[fontTextStyles.regular, styles.subtext]} />
          ) : null}
        </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingVertical: 4,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  avatarContainer: {
    width: 51,
    height: 51,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#0D244F",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#FFFFFF",
  },
  subtext: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  raceBtn: {
    borderRadius: 9999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  raceBtnText: {
    ...fontTextStyles.twelveBoldBlack,
    color: "rgba(0, 0, 0, 0.9)",
  },
});
