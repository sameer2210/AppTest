import React from "react";
import { View, StyleSheet } from "react-native";
import CustomText from "@/components/CustomText";
import SuggestionRow from "./SuggestionRow";

const formatIsoDay = (d?: Date | null) => {
  if (!d || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

interface CreateEventSuggestionsSectionProps {
  registrationStartDate?: Date | null;
  registrationEndDate?: Date | null;
  onOpenRegStartDate: () => void;
  onOpenRegEndDate: () => void;
  dateWarning?: { field: string; message: string } | null;
  participantFields?: string[];
  onOpenParticipantModal: () => void;
  capacity?: string;
  onOpenCapacityModal: () => void;
  rewardLabels?: string[];
  onOpenRewardsModal: () => void;
}

export const CreateEventSuggestionsSection = React.memo(
  ({
    registrationStartDate,
    registrationEndDate,
    onOpenRegStartDate,
    onOpenRegEndDate,
    dateWarning,
    participantFields = [],
    onOpenParticipantModal,
    capacity,
    onOpenCapacityModal,
    rewardLabels = [],
    onOpenRewardsModal,
  }: CreateEventSuggestionsSectionProps) => {
    return (
      <View style={styles.container}>
        <CustomText style={styles.heading}>
          Suggestions, Add if you want
        </CustomText>
        <View style={styles.rowsGap}>
          <SuggestionRow
            icon="calendar-outline"
            label="Registration Start Date"
            subtitle={
              registrationStartDate
                ? `Selected : ${formatIsoDay(registrationStartDate)}`
                : "Default : On Event Publish date"
            }
            onPress={onOpenRegStartDate}
            bgStyle={{ backgroundColor: "#11141A" }}
          />
          {dateWarning?.field === "regStart" ? (
            <CustomText style={styles.warningText}>
              {dateWarning.message}
            </CustomText>
          ) : null}

          <SuggestionRow
            icon="close-circle-outline"
            label="Registration Closing Date"
            subtitle={
              registrationEndDate
                ? `Selected : ${formatIsoDay(registrationEndDate)}`
                : "Default : On Event End date"
            }
            onPress={onOpenRegEndDate}
            bgStyle={{ backgroundColor: "#11141A" }}
          />
          {dateWarning?.field === "reg" ? (
            <CustomText style={styles.warningText}>
              {dateWarning.message}
            </CustomText>
          ) : null}

          <SuggestionRow
            icon="information-circle-outline"
            label="Participant Info Needed"
            subtitle={
              participantFields.length > 0
                ? participantFields.join(", ")
                : "Default : T-Shirt Size, Emergency Contact"
            }
            onPress={onOpenParticipantModal}
            bgStyle={{ backgroundColor: "#11141A" }}
          />

          <SuggestionRow
            icon="people-outline"
            label="Capacity"
            subtitle={capacity ? `${capacity} Seats` : "Default : Unlimited"}
            onPress={onOpenCapacityModal}
            bgStyle={{ backgroundColor: "#11141A" }}
          />

          <SuggestionRow
            icon="star-outline"
            label="Rewards"
            subtitle={
              rewardLabels.length > 0
                ? rewardLabels.join(", ")
                : "Default : e-Certificate, e-Medal"
            }
            onPress={onOpenRewardsModal}
            bgStyle={{ backgroundColor: "#11141A" }}
          />
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  heading: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "500",
    color: "#D9D9D9",
  },
  rowsGap: {
    gap: 10,
  },
  warningText: {
    marginTop: -4,
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 16,
    color: "#FF6B6B",
  },
});

export default CreateEventSuggestionsSection;
