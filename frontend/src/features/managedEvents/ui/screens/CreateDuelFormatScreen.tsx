import React from "react";
import { useLocalSearchParams } from "expo-router";
import { registrationDateWarning, useTimedWarning } from "../components/create/hooks/useTimedWarning";
import { useCreateDuelViewModel } from "../components/create/viewmodels/useCreateDuelViewModel";
import { CreateEventFormShell } from "../components/create/components";
import { PhoneVerifyModal } from "@/features/auth";
import { DarkDatePickerModal } from "@/components/modals/DarkDatePickerModal";
import { startOfDay } from "../components/create/viewmodels/useCreateEventViewModel";

export const CreateDuelFormatScreen = React.memo(() => {
  const params = useLocalSearchParams<{ format?: string; key?: string }>();
  const format = params.format === "king_of_the_hill" ? "king_of_the_hill" : "face_off";

  const vm = useCreateDuelViewModel(format, params.key);
  const { warning: dateWarning, showWarning: showDateWarning } = useTimedWarning<
    "regStart" | "reg"
  >(6000);

  return (
    <>
      <CreateEventFormShell
        format={format}
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
        price={vm.price}
        onChangePrice={vm.setPrice}
        freeEvent={vm.freeEvent}
        onToggleFreeEvent={vm.toggleFreeEvent}
        visibility={vm.visibility}
        onChangeVisibility={vm.setVisibility}
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
        extraModals={
          <PhoneVerifyModal
            visible={vm.phoneVerifyOpen}
            onClose={() => vm.setPhoneVerifyOpen(false)}
            onVerified={() => {
              vm.setPhoneVerifyOpen(false);
              void vm.onPublish({ phoneJustVerified: true });
            }}
          />
        }
      />

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
            vm.setHasCustomRegEndDate(true);
          }
        }}
      />
    </>
  );
});

export default CreateDuelFormatScreen;
