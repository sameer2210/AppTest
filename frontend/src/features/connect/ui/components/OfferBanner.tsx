import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { PartyPopperIcon } from "./PartyPopperIcon";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

type Props = {
  title?: string;
  subtitle?: string;
  onPress?: () => void;
};

export const OfferBanner: React.FC<Props> = memo(
  ({ title = "You have a special offer.", subtitle = "Click to claim now", onPress }) => {
    return (
      <PressableScale
        onPress={onPress}
        style={styles.banner}
      >
        <View style={styles.iconBox}>
          <PartyPopperIcon size={26} color="#FFFFFF" />
        </View>
        <View style={styles.textContainer}>
          <CustomText style={styles.title}>{title}</CustomText>
          <CustomText style={styles.subtitle}>{subtitle}</CustomText>
        </View>
      </PressableScale>
    );
  },
);

OfferBanner.displayName = "OfferBanner";

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#1E65FF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  iconBox: {
    marginRight: 14,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...headingTextStyles.h4,
    fontSize: 17,
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 2,
    ...fontTextStyles.regular,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },
});

export default OfferBanner;
