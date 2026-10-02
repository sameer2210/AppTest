import React from "react";
import { StyleSheet, View } from "react-native";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

export type ListingVisibility = "public" | "private";

export type ListingVisibilityToggleProps = {
  value: ListingVisibility;
  onChange: (value: ListingVisibility) => void;
  disabled?: boolean;
};

export const ListingVisibilityToggle: React.FC<ListingVisibilityToggleProps> = ({
  value = "public",
  onChange,
  disabled = false,
}) => {
  const isPublic = value === "public";
  const isPrivate = value === "private";

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <CustomText style={styles.title}>Listing Visibility</CustomText>
        <CustomText style={styles.subtitle}>Private (link only), Public (anyone)</CustomText>
      </View>

      <View style={styles.pillContainer}>
        <PressableScale
          onPress={() => !disabled && onChange("public")}
          style={[styles.pillOption, isPublic && styles.pillOptionActive]}
          scale={0.96}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: isPublic }}
          accessibilityLabel="Public visibility"
        >
          <CustomText style={[styles.pillText, isPublic && styles.pillTextActive]}>Public</CustomText>
        </PressableScale>

        <PressableScale
          onPress={() => !disabled && onChange("private")}
          style={[styles.pillOption, isPrivate && styles.pillOptionActive]}
          scale={0.96}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: isPrivate }}
          accessibilityLabel="Private visibility"
        >
          <CustomText style={[styles.pillText, isPrivate && styles.pillTextActive]}>Private</CustomText>
        </PressableScale>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    ...fontTextStyles.fourteenBoldBlack,
    color: "#FFFFFF",
  },
  subtitle: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.65)",
    marginTop: 3,
  },
  pillContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  pillOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  pillOptionActive: {
    backgroundColor: "#000000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 3,
  },
  pillText: {
    ...fontTextStyles.twelveMediumBlack,
    color: "rgba(255, 255, 255, 0.7)",
  },
  pillTextActive: {
    ...fontTextStyles.twelveBoldBlack,
    color: "#FFFFFF",
  },
});

export default ListingVisibilityToggle;
