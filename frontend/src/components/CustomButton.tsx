import { StyleProp, StyleSheet, TextStyle, TouchableOpacity, ViewStyle } from "react-native";
import { colors } from "../utils/colors";
import CustomText from "../components/CustomText";
import { radius, shadow, spacing } from "../utils/design-tokens";
import { fontTextStyles } from "@/utils/typography";
import { useTranslation } from "react-i18next";

const styles = StyleSheet.create({
  primaryTextStyle: {
    ...fontTextStyles.eighteenBoldBlack,
    color: colors.white,
  },
  mintTextStyle: {
    ...fontTextStyles.eighteenBoldBlack,
    color: colors.white,
  },
  borderTextStyle: {
    ...fontTextStyles.eighteenBoldBlack,
    color: colors.secondary,
  },
  ghostTextStyle: {
    ...fontTextStyles.eighteenNormalBlack,
    color: colors.subheadingText,
  },
  buttonContainer: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.smMd,
    backgroundColor: colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  mintContainer: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.smMd,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  borderContainer: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.smMd,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ghostContainer: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.mdLg,
    paddingVertical: spacing.smMd,
    borderWidth: 0.5,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});

interface IProps {
  text?: string;
  tx?: Parameters<ReturnType<typeof useTranslation>["t"]>[0];
  txOptions?: Parameters<ReturnType<typeof useTranslation>["t"]>[1];
  onPress: () => void;
  buttonType?: "normal" | "border" | "mint" | "ghost";
  buttonStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

const CustomButton = (props: IProps) => {
  const {
    text,
    tx,
    txOptions,
    onPress,
    buttonType = "border",
    buttonStyle = {},
    labelStyle = {},
  } = props;

  const renderButton = () => {
    switch (buttonType) {
      case "normal":
        return (
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[styles.buttonContainer, buttonStyle]}
          >
            <CustomText
              text={text}
              tx={tx}
              txOptions={txOptions}
              style={[styles.primaryTextStyle, labelStyle]}
            />
          </TouchableOpacity>
        );
      case "mint":
        return (
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[styles.mintContainer, buttonStyle]}
          >
            <CustomText
              text={text}
              tx={tx}
              txOptions={txOptions}
              style={[styles.mintTextStyle, labelStyle]}
            />
          </TouchableOpacity>
        );
      case "ghost":
        return (
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[styles.ghostContainer, buttonStyle]}
          >
            <CustomText
              text={text}
              tx={tx}
              txOptions={txOptions}
              style={[styles.ghostTextStyle, labelStyle]}
            />
          </TouchableOpacity>
        );
      case "border":
      default:
        return (
          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[styles.borderContainer, buttonStyle]}
          >
            <CustomText
              text={text}
              tx={tx}
              txOptions={txOptions}
              style={[styles.borderTextStyle, labelStyle]}
            />
          </TouchableOpacity>
        );
    }
  };

  return renderButton();
};

export default CustomButton;
