import React from "react";
import { ScrollView, TouchableOpacity, View, StyleSheet } from "react-native";
import { captureEvent } from "@/analytics/posthog/events";
import CustomText from "@/components/CustomText";

export const EXPLORE_FILTERS = ["All", "Challenges", "Events", "Games"] as const;
export type ExploreFilter = (typeof EXPLORE_FILTERS)[number] | "Trainers" | "Gyms";

interface ExploreFilterChipsProps {
  activeFilter: ExploreFilter;
  onFilterSelect: (filter: ExploreFilter) => void;
}

const ExploreFilterChips = ({ activeFilter, onFilterSelect }: ExploreFilterChipsProps) => {
  return (
    <View style={styles.container}>
      <CustomText style={styles.heading}>Explore by Category</CustomText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {EXPLORE_FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              activeOpacity={0.7}
              onPress={() => {
                captureEvent("explore_filter_changed", { category: filter });
                onFilterSelect(filter);
              }}
              style={[
                styles.chip,
                isActive ? styles.chipActive : styles.chipInactive,
              ]}
            >
              <CustomText style={styles.chipText}>{filter}</CustomText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingLeft: 14,
  },
  heading: {
    marginBottom: 12,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  scrollContent: {
    paddingRight: 14,
  },
  chip: {
    marginRight: 8,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 37,
    paddingHorizontal: 20,
  },
  chipActive: {
    backgroundColor: "#2A80FF",
  },
  chipInactive: {
    backgroundColor: "rgba(33, 33, 33, 0.6)",
  },
  chipText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
});

export default ExploreFilterChips;
