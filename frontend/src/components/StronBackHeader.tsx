import { View, StyleSheet } from "react-native";
import { headingTextStyles } from "@/utils/typography";
import CustomText from "./CustomText";
import GlassBackButton from "./ui/GlassBackButton";

export type StronBackHeaderAlign = "spread" | "back-only" | "inline";

const INLINE_BACK_SIZE = 40;

type Props = {
  onBack: () => void;
  title?: string;
  align?: StronBackHeaderAlign;
  rightSlot?: React.ReactNode;
};

const StronBackHeader = ({ onBack, title, align = "spread", rightSlot }: Props) => {
  if (align === "back-only") {
    return <GlassBackButton onPress={onBack} />;
  }

  if (align === "inline") {
    return (
      <View style={styles.row}>
        <GlassBackButton onPress={onBack} size={INLINE_BACK_SIZE} iconSize={20} />
        {title ? (
          <CustomText text={title} style={styles.inlineTitle} numberOfLines={1} />
        ) : (
          <View style={styles.inlineTitleSpacer} />
        )}
        {rightSlot ?? <View style={styles.backBtnSpacer} />}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <GlassBackButton onPress={onBack} />
      {rightSlot ??
        (title ? <CustomText text={title} style={styles.spreadTitle} numberOfLines={1} /> : null)}
    </View>
  );
};

export default StronBackHeader;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtnSpacer: {
    width: INLINE_BACK_SIZE,
    height: INLINE_BACK_SIZE,
  },
  spreadTitle: {
    ...headingTextStyles.twentyEightExtraBoldBlack,
    color: "#D9D9D9",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 12,
    marginRight: 12,
  },
  inlineTitle: {
    ...headingTextStyles.twentyFourExtraBoldBlack,
    flex: 1,
    color: "#FFFFFF",
    textAlign: "center",
    marginHorizontal: 8,
  },
  inlineTitleSpacer: {
    flex: 1,
  },
});
