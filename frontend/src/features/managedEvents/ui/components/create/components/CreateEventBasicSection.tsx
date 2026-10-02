import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { PressableScale } from "@/components/ui";
import EventFormatBanner from "@/components/EventFormatBanner";
import CreateGlassField from "@/components/form/CreateGlassField";

const formatIsoDay = (d?: Date | null) => {
  if (!d || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export interface CreateEventBasicSectionProps {
  format: "marathon" | "step_challenge" | "duel" | "face_off" | "king_of_the_hill";
  title: string;
  onChangeTitle: (val: string) => void;
  organizerName: string;
  onChangeOrganizerName: (val: string) => void;
  bannerUri?: string | null;
  bannerName?: string | null;
  uploadingBanner?: boolean;
  onPickBanner: () => void;
  startDate: Date;
  durationDays: string;
  onChangeDurationDays: (val: string) => void;
  onOpenStartDatePicker: () => void;
}

export const CreateEventBasicSection = React.memo((props: CreateEventBasicSectionProps) => {
  const {
    format,
    title,
    onChangeTitle,
    organizerName,
    onChangeOrganizerName,
    bannerUri,
    bannerName,
    uploadingBanner,
    onPickBanner,
    startDate,
    durationDays,
    onChangeDurationDays,
    onOpenStartDatePicker,
  } = props;

  return (
    <>
      <CreateGlassField
        label="Title"
        placeholder="e.g. STRON Marathon 2026"
        value={title}
        onChangeText={onChangeTitle}
      />

      <CreateGlassField
        label="Organizer Name"
        placeholder="e.g. STRON Athletics"
        value={organizerName}
        onChangeText={onChangeOrganizerName}
      />

      {/* Banner upload */}
      <PressableScale
        style={styles.bannerBtn}
        onPress={onPickBanner}
        disabled={uploadingBanner}
        accessibilityRole="button"
        accessibilityLabel="Upload organizer logo"
      >
        <EventFormatBanner
          format={format}
          logoUri={bannerUri || bannerName}
          style={styles.bannerImage}
          resizeMode="cover"
          showUploadPlaceholder
        />
        {uploadingBanner ? (
          <View style={styles.bannerLoadingOverlay}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}
      </PressableScale>

      {/* Side-by-Side: Start Date & Duration */}
      <View style={styles.rowGap}>
        <View style={styles.flexOne}>
          <PressableScale onPress={onOpenStartDatePicker}>
            <View pointerEvents="none">
              <CreateGlassField
                label="Event Start Date"
                placeholder="dd/mm/yyyy"
                value={formatIsoDay(startDate)}
                editable={false}
                icon="calendar-outline"
              />
            </View>
          </PressableScale>
        </View>

        <View style={styles.flexOne}>
          <CreateGlassField
            label="Duration (days)"
            placeholder="3"
            value={durationDays}
            onChangeText={onChangeDurationDays}
            keyboardType="number-pad"
          />
        </View>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  bannerBtn: {
    height: 128,
    borderRadius: 20,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  bannerLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowGap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  flexOne: {
    flex: 1,
  },
});
