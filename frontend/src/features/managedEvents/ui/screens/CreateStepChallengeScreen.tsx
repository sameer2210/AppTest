import React, { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import type { ListingType } from "@/models/stronManaged/event";
import { useCreateEventViewModel, startOfDay } from "../components/create/viewmodels/useCreateEventViewModel";
import { registrationDateWarning, useTimedWarning } from "../components/create/hooks/useTimedWarning";
import { CreateEventFormShell } from "../components/create/components";
import CreateGlassField from "@/components/form/CreateGlassField";
import { DarkDatePickerModal } from "@/components/modals/DarkDatePickerModal";

export const CreateStepChallengeScreen = React.memo(() => {
  const params = useLocalSearchParams<{ key?: string; listingType?: string }>();

  const createOptions = useMemo(() => {
    const editKey = typeof params.key === "string" ? params.key.trim() : "";
    const listingType: ListingType | undefined =
      params.listingType === "self_managed" ||
      params.listingType === "external" ||
      params.listingType === "stron_managed"
        ? params.listingType
        : undefined;
    return { editKey: editKey || undefined, listingType };
  }, [params.key, params.listingType]);

  const vm = useCreateEventViewModel("step_challenge", createOptions);
  const { warning: dateWarning, showWarning: showDateWarning } = useTimedWarning<
    "regStart" | "reg"
  >(6000);

  return (
    <>
      <CreateEventFormShell
        format="step_challenge"
        title={vm.title}
        onChangeTitle={vm.setTitle}
        organizerName={vm.organizerName}
        onChangeOrganizerName={vm.setOrganizerName}
        bannerUri={vm.bannerUri}
        bannerName={vm.bannerName}
        uploadingBanner={vm.uploadingBanner}
        onPickBanner={() => void vm.pickBanner()}
        startDate={vm.startDate}
        durationDays={vm.durationDays}
        onChangeDurationDays={vm.setDurationDays}
        onOpenStartDatePicker={() => vm.setDatePicker("start")}
        price={vm.quickPrice}
        onChangePrice={vm.setQuickPrice}
        onCommitPrice={vm.commitQuickTicket}
        freeEvent={vm.freeEvent}
        onToggleFreeEvent={vm.toggleFreeEvent}
        visibility={vm.visibility}
        onChangeVisibility={vm.setVisibility}
        tickets={vm.tickets}
        ticketModalOpen={vm.ticketModalOpen}
        onCloseTicketModal={() => {
          vm.setTicketModalOpen(false);
          vm.setEditingTicket(null);
        }}
        editingTicket={vm.editingTicket}
        onSaveTicket={vm.saveTicket}
        onOpenTicketModal={(t) => vm.openTicketModal(t)}
        onRemoveTicket={vm.removeTicketRow}
        registrationStartDate={vm.registrationStartDate}
        registrationEndDate={vm.registrationEndDate}
        onOpenRegStartDate={() => vm.setDatePicker("regStart")}
        onOpenRegEndDate={() => vm.setDatePicker("reg")}
        dateWarning={dateWarning}
        participantFields={vm.requiredParticipantFields}
        onChangeParticipantFields={vm.setRequiredParticipantFields}
        capacity={vm.capacity}
        onChangeCapacity={vm.setCapacity}
        rewardLabels={vm.rewardLabels}
        onChangeRewardLabels={vm.setRewardLabels}
        isEditing={vm.isEditing}
        loadingEdit={vm.loadingEdit}
        publishing={vm.publishing}
        onPublish={() => void vm.onPublish()}
      >
        <CreateGlassField
          label="Step Goal (per day)"
          placeholder="10000"
          value={vm.goalAmount}
          onChangeText={vm.setGoalAmount}
          suffix="Steps"
          keyboardType="number-pad"
        />
      </CreateEventFormShell>

      <DarkDatePickerModal
        visible={vm.datePicker != null}
        title={
          vm.datePicker === "start"
            ? "Pick Event Start Date"
            : vm.datePicker === "regStart"
              ? "Pick Registration Start Date"
              : vm.datePicker === "reg"
                ? "Pick Registration Closing Date"
                : "Pick a Date"
        }
        initialDate={
          vm.datePicker === "start"
            ? vm.startDate
            : vm.datePicker === "regStart"
              ? vm.registrationStartDate
              : vm.registrationEndDate
        }
        onClose={() => vm.setDatePicker(null)}
        onConfirm={(date, clamped) => {
          const which = vm.datePicker;
          vm.setDatePicker(null);
          if (!which) return;
          const next = startOfDay(date);
          if (which === "start") {
            if (!vm.canEditStartDate) return;
            vm.setStartDate(next);
          } else if (which === "regStart") {
            if (clamped) {
              showDateWarning("regStart", registrationDateWarning("regStart", clamped));
            }
            vm.setRegistrationStartDate(next);
          } else if (which === "reg") {
            if (clamped) {
              showDateWarning("reg", registrationDateWarning("reg", clamped));
            }
            vm.setRegistrationEndDate(next);
          }
        }}
      />
    </>
  );
});

export default CreateStepChallengeScreen;
