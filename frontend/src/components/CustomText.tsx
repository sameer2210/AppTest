import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { fontTextStyles } from "@/utils/typography";
import { colors } from "../utils/colors";
import { cssInterop } from "nativewind";

const styles = StyleSheet.create({
  textStyle: {
    ...fontTextStyles.eighteenNormalBlack,
    color: colors.headingText,
  },
});

interface IProps {
  text?: string;
  tx?: Parameters<ReturnType<typeof useTranslation>["t"]>[0];
  txOptions?: Parameters<ReturnType<typeof useTranslation>["t"]>[1];
  style?: StyleProp<TextStyle>;
}

type Props = IProps & TextProps;

const CustomText = (props: Props) => {
  const { t } = useTranslation();
  const { text, tx, txOptions, style = {}, children, ...extraProps } = props;

  const resolvedText = tx ? (t(tx as any, txOptions as any) as unknown as string) : text;

  return (
    <Text style={[styles.textStyle, style]} {...extraProps}>
      {resolvedText ?? children}
    </Text>
  );
};

cssInterop(CustomText, { className: "style" });

export default CustomText;

