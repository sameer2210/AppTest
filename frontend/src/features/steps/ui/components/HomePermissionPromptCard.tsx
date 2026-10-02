import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { ctaStyles } from "@/utils/ctaStyles";

type HomePermissionPromptCardProps = {
  icon: ImageSourcePropType;
  title: string;
  subtitle: string;
  buttonLabel: string;
  requesting: boolean;
  onPress: () => void;
  tone?: "alert" | "info";
};

const HomePermissionPromptCard = ({
  icon,
  title,
  subtitle,
  buttonLabel,
  requesting,
  onPress,
  tone = "info",
}: HomePermissionPromptCardProps) => (
  <View style={[styles.card, tone === "alert" ? styles.cardAlert : styles.cardInfo]}>
    <Image source={icon} style={styles.icon} resizeMode="contain" />
    <View style={styles.copy}>
      <CustomText text={title} style={styles.title} />
      <CustomText text={subtitle} style={styles.subtitle} />
    </View>
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={requesting}
      activeOpacity={0.7}
    >
      {requesting ? (
        <ActivityIndicator color="#111111" />
      ) : (
        <CustomText text={buttonLabel} style={styles.buttonText} />
      )}
    </TouchableOpacity>
  </View>
);

export default HomePermissionPromptCard;

const styles = StyleSheet.create({
  card: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardAlert: {
    backgroundColor: "rgba(68, 25, 25, 0.92)",
    borderColor: "rgba(255, 107, 107, 0.35)",
  },
  cardInfo: {
    backgroundColor: "rgba(25, 43, 68, 0.92)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  icon: {
    width: "10%",
    aspectRatio: 1,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...headingTextStyles.fourteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  subtitle: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  button: {
    ...ctaStyles.compactButton,
    flexShrink: 0,
  },
  buttonText: ctaStyles.compactButtonText,
});
