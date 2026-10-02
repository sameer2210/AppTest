import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

export type CategoryType =
  | "Events"
  | "Challenges"
  | "Games"
  | "Supplements"
  | "Gear"
  | "Services"
  | "All"
  | "Subscriptions"
  | "In-Person Events";

const CATEGORIES: CategoryType[] = [
  "Events",
  "Challenges",
  "Games",
  "Supplements",
  "Gear",
  "Services",
];

type Props = {
  selectedCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  /** Smart QR matrix: hide categories that don't apply for this view. */
  categories?: CategoryType[];
};

export const CategoryFilterBar: React.FC<Props> = memo(
  ({ selectedCategory, onSelectCategory, categories = CATEGORIES }) => {
    if (categories.length <= 1) return null;

    return (
      <View style={styles.container}>
        <CustomText style={styles.label}>
          Explore by Category
        </CustomText>

        <View style={styles.chipContainer}>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <PressableScale
                key={cat}
                onPress={() => onSelectCategory(cat)}
                style={[
                  styles.chip,
                  isSelected ? styles.chipSelected : styles.chipDefault,
                ]}
              >
                <CustomText
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {cat}
                </CustomText>
              </PressableScale>
            );
          })}
        </View>
      </View>
    );
  },
);

CategoryFilterBar.displayName = "CategoryFilterBar";

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    width: "100%",
  },
  label: {
    ...fontTextStyles.medium,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 10,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
  },
  chipDefault: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  chipSelected: {
    backgroundColor: "#1E65FF",
    borderColor: "#1E65FF",
  },
  chipText: {
    ...fontTextStyles.medium,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },
  chipTextSelected: {
    ...fontTextStyles.semiBold,
    color: "#FFFFFF",
  },
});

export default CategoryFilterBar;
