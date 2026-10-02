import React, { memo } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
export interface SpeedWorkoutItem {
  id: string;
  title?: string;
  subtitle?: string;
  [key: string]: any;
}

const SpeedWorkoutItemCard: React.FC<{
  workout: SpeedWorkoutItem;
  onPress: (workout: SpeedWorkoutItem) => void;
}> = ({ workout, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={() => onPress(workout)}
    style={{ paddingVertical: 8 }}
  >
    <CustomText style={{ color: "#FFFFFF" }}>{workout.title || workout.id}</CustomText>
  </TouchableOpacity>
);

interface AssignedSavedWorkoutsCardProps {
  workouts: SpeedWorkoutItem[];
  onSelectWorkout: (workout: SpeedWorkoutItem) => void;
  onCustomSessionPress: () => void;
}

export const AssignedSavedWorkoutsCard: React.FC<AssignedSavedWorkoutsCardProps> =
  memo(({ workouts, onSelectWorkout, onCustomSessionPress }) => {
    return (
      <View style={styles.container}>
        <CustomText style={styles.sectionHeader}>
          Assigned and Saved Workout
        </CustomText>

        {workouts.map((workout) => (
          <SpeedWorkoutItemCard
            key={workout.id}
            workout={workout}
            onPress={onSelectWorkout}
          />
        ))}

        {/* Build a custom session */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={onCustomSessionPress}
          style={styles.customSessionButton}
          accessibilityRole="button"
          accessibilityLabel="Build a custom session"
        >
          <View style={styles.customIconContainer}>
            <Feather name="plus-square" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.customTextContainer}>
            <CustomText style={styles.customTitle}>
              Build a custom session
            </CustomText>
            <CustomText style={styles.customSubtitle}>
              Select and search the full exercise library
            </CustomText>
          </View>
        </TouchableOpacity>
      </View>
    );
  });

AssignedSavedWorkoutsCard.displayName = "AssignedSavedWorkoutsCard";

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#161920",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 24,
  },
  sectionHeader: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#FFFFFF",
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  customSessionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22252B",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginTop: 4,
  },
  customIconContainer: {
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  customTextContainer: {
    flex: 1,
  },
  customTitle: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#FFFFFF",
    marginBottom: 1,
  },
  customSubtitle: {
    ...fontTextStyles.twelveRegularBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
});
