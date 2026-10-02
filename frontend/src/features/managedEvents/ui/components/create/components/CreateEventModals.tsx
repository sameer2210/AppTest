import React, { useRef, useState, useEffect } from "react";
import { Modal, TextInput, View, StyleSheet } from "react-native";
import CustomText from "@/components/CustomText";
import { PressableScale } from "@/components/ui";
import ChipSelectSection, { type ChipSelectSectionHandle } from "./ChipSelectSection";
import {
  PARTICIPANT_INFO_PRESET_OPTIONS,
  REWARD_PRESET_OPTIONS,
} from "../../../shared/eventRewards";

interface CreateEventModalsProps {
  participantModalOpen: boolean;
  onCloseParticipantModal: () => void;
  participantFields: string[];
  onChangeParticipantFields?: (fields: string[]) => void;

  rewardsModalOpen: boolean;
  onCloseRewardsModal: () => void;
  rewardLabels: string[];
  onChangeRewardLabels?: (labels: string[]) => void;

  capacityModalOpen: boolean;
  onCloseCapacityModal: () => void;
  capacity: string;
  onChangeCapacity?: (val: string) => void;
}

export const CreateEventModals = React.memo((props: CreateEventModalsProps) => {
  const {
    participantModalOpen,
    onCloseParticipantModal,
    participantFields,
    onChangeParticipantFields,
    rewardsModalOpen,
    onCloseRewardsModal,
    rewardLabels,
    onChangeRewardLabels,
    capacityModalOpen,
    onCloseCapacityModal,
    capacity,
    onChangeCapacity,
  } = props;

  const rewardsChipRef = useRef<ChipSelectSectionHandle | null>(null);
  const [capacityDraft, setCapacityDraft] = useState(capacity);

  useEffect(() => {
    if (capacityModalOpen) {
      setCapacityDraft(capacity);
    }
  }, [capacityModalOpen, capacity]);

  return (
    <>
      {/* Participant Info Needed Modal */}
      <Modal visible={participantModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <CustomText style={styles.modalTitle}>
              Participant Info Needed
            </CustomText>
            <ChipSelectSection
              title=""
              icon="information-circle-outline"
              options={PARTICIPANT_INFO_PRESET_OPTIONS}
              selected={participantFields}
              onChange={(f) => onChangeParticipantFields?.(f)}
            />
            <PressableScale
              onPress={onCloseParticipantModal}
              style={styles.doneBtn}
            >
              <CustomText style={styles.doneBtnText}>Done</CustomText>
            </PressableScale>
          </View>
        </View>
      </Modal>

      {/* Rewards Selection Modal */}
      <Modal visible={rewardsModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <CustomText style={styles.modalTitle}>
              Event Rewards
            </CustomText>
            <ChipSelectSection
              title=""
              icon="star-outline"
              options={REWARD_PRESET_OPTIONS}
              ref={rewardsChipRef}
              selected={rewardLabels}
              onChange={(r) => onChangeRewardLabels?.(r)}
            />
            <PressableScale
              onPress={() => {
                rewardsChipRef.current?.commitCustom();
                onCloseRewardsModal();
              }}
              style={styles.doneBtn}
            >
              <CustomText style={styles.doneBtnText}>Done</CustomText>
            </PressableScale>
          </View>
        </View>
      </Modal>

      {/* Capacity Modal */}
      <Modal visible={capacityModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <CustomText style={styles.modalTitle}>
              Event Capacity
            </CustomText>
            <TextInput
              value={capacityDraft}
              onChangeText={setCapacityDraft}
              keyboardType="number-pad"
              autoFocus
              placeholder="Enter capacity (or leave blank for No Limit)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.capacityInput}
            />
            <View style={styles.actionRow}>
              <PressableScale onPress={onCloseCapacityModal}>
                <CustomText style={styles.cancelText}>Cancel</CustomText>
              </PressableScale>
              <PressableScale
                onPress={() => {
                  onChangeCapacity?.(capacityDraft.trim());
                  onCloseCapacityModal();
                }}
              >
                <CustomText style={styles.saveText}>Save</CustomText>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#161A22",
    padding: 20,
  },
  modalTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "500",
    color: "#D9D9D9",
  },
  doneBtn: {
    marginTop: 16,
    alignSelf: "flex-end",
    padding: 8,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#086CFF",
  },
  capacityInput: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 12,
    fontSize: 15,
    color: "#FFFFFF",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
  },
  cancelText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.55)",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#086CFF",
  },
});

export default CreateEventModals;
