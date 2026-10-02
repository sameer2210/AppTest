import { Image, StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import { getProfileImageSource } from "@/utils/profileImage.utils";

type Props = {
  title?: string;
  username?: string | null;
  avatarUri?: string | null;
  subtitle: string;
};

/** Shared blue “Your Score” strip — KotH / Face Off variants. */
const LiveYourScoreCard = ({ title = "Your Score", username, avatarUri, subtitle }: Props) => {
  const avatar = getProfileImageSource(avatarUri, username || "You");
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <CustomText style={styles.title}>{title}</CustomText>
        <View style={styles.userContainer}>
          <View style={styles.avatarWrap}>
            <Image source={avatar} style={styles.avatarImg} resizeMode="cover" />
          </View>
          <CustomText style={styles.usernameText} numberOfLines={1}>
            {username || "You"}
          </CustomText>
        </View>
      </View>
      <CustomText style={styles.subtitleText}>{subtitle}</CustomText>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: "#086CFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontSize: 22,
    color: "#FFFFFF",
  },
  userContainer: {
    maxWidth: "55%",
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarWrap: {
    width: 28,
    height: 28,
    overflow: "hidden",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  usernameText: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  subtitleText: {
    marginTop: 6,
    fontSize: 15,
    color: "#FFFFFF",
  },
});

export default LiveYourScoreCard;
