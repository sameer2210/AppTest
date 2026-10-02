import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  StyleSheet,
} from "react-native";
import { ScreenImageBackground } from "@/components/ui";
import { images } from "@/utils/images";
import { showToastMessage } from "@/utils/app-utils";
import PublishActionBar from "@/components/actionBar/PublishActionBar";
import CreateTicketModal, { type DraftTicket } from "./CreateTicketModal";
import { CreateEventHeroCard } from "./CreateEventHeroCard";
import { CreateEventBasicSection } from "./CreateEventBasicSection";
import { CreateEventPricingSection } from "./CreateEventPricingSection";
import { CreateEventSuggestionsSection } from "./CreateEventSuggestionsSection";
import { CreateEventTermsCheckbox } from "./CreateEventTermsCheckbox";
import { CreateEventModals } from "./CreateEventModals";
import type { ListingVisibility } from "./ListingVisibilityToggle";
import {
  SCREEN_CONTENT_PADDING_BOTTOM,
  SCREEN_HORIZONTAL_PADDING_WIDE,
} from "@/utils/screen-layout";

export interface CreateEventFormShellProps {
  heroTitle?: string;
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
  price: string;
  onChangePrice: (val: string) => void;
  onCommitPrice?: () => void;
  freeEvent: boolean;
  onToggleFreeEvent: () => void;
  visibility: ListingVisibility;
  onChangeVisibility: (val: ListingVisibility) => void;
  tickets?: DraftTicket[];
  ticketModalOpen?: boolean;
  onCloseTicketModal?: () => void;
  editingTicket?: DraftTicket | null;
  onSaveTicket?: (t: DraftTicket, opts?: { addAnother?: boolean }) => void;
  onOpenTicketModal?: (t: DraftTicket | null) => void;
  onRemoveTicket?: (id: string) => void;
  registrationStartDate?: Date | null;
  registrationEndDate?: Date | null;
  onOpenRegStartDate: () => void;
  onOpenRegEndDate: () => void;
  dateWarning?: { field: string; message: string } | null;
  participantFields?: string[];
  onChangeParticipantFields?: (fields: string[]) => void;
  capacity?: string;
  onChangeCapacity?: (val: string) => void;
  rewardLabels?: string[];
  onChangeRewardLabels?: (labels: string[]) => void;
  isEditing?: boolean;
  loadingEdit?: boolean;
  publishing?: boolean;
  onPublish: () => void;
  children?: React.ReactNode;
  /** Custom extra modals or content */
  extraModals?: React.ReactNode;
}

export const CreateEventFormShell = React.memo((props: CreateEventFormShellProps) => {
  const {
    heroTitle,
    format,
    title,
    onChangeTitle,
    organizerName,
    onChangeOrganizerName,
    bannerUri,
    bannerName,
    uploadingBanner = false,
    onPickBanner,
    startDate,
    durationDays,
    onChangeDurationDays,
    onOpenStartDatePicker,
    price,
    onChangePrice,
    onCommitPrice,
    freeEvent,
    onToggleFreeEvent,
    visibility,
    onChangeVisibility,
    tickets = [],
    ticketModalOpen = false,
    onCloseTicketModal,
    editingTicket = null,
    onSaveTicket,
    onOpenTicketModal,
    onRemoveTicket,
    registrationStartDate,
    registrationEndDate,
    onOpenRegStartDate,
    onOpenRegEndDate,
    dateWarning,
    participantFields = [],
    onChangeParticipantFields,
    capacity = "",
    onChangeCapacity,
    rewardLabels = [],
    onChangeRewardLabels,
    isEditing = false,
    loadingEdit = false,
    publishing = false,
    onPublish,
    children,
    extraModals,
  } = props;

  const defaultHeroTitle = React.useMemo(() => {
    switch (format) {
      case "marathon":
        return isEditing ? "Edit Event" : "Create Event";
      case "step_challenge":
        return isEditing ? "Edit Challenge" : "STRON Challenge";
      case "king_of_the_hill":
      case "face_off":
      case "duel":
        return isEditing ? "Edit Game" : "Create Game";
      default:
        return isEditing ? "Edit Event" : "Create Event";
    }
  }, [format, isEditing]);

  const displayHeroTitle = heroTitle || defaultHeroTitle;
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsBox, setShowTermsBox] = useState(true);
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [rewardsModalOpen, setRewardsModalOpen] = useState(false);
  const [capacityModalOpen, setCapacityModalOpen] = useState(false);

  useEffect(() => {
    if (termsAccepted) {
      const timer = setTimeout(() => setShowTermsBox(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowTermsBox(true);
    }
  }, [termsAccepted]);

  if (loadingEdit) {
    return (
      <View style={styles.loadingContainer}>
        <ScreenImageBackground source={images.HOME_V2.BG} flipY edgeToEdge={false} />
        <ActivityIndicator color="#D9D9D9" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CreateEventHeroCard title={displayHeroTitle}>
            <CreateEventBasicSection
              format={format}
              title={title}
              onChangeTitle={onChangeTitle}
              organizerName={organizerName}
              onChangeOrganizerName={onChangeOrganizerName}
              bannerUri={bannerUri}
              bannerName={bannerName}
              uploadingBanner={uploadingBanner}
              onPickBanner={onPickBanner}
              startDate={startDate}
              durationDays={durationDays}
              onChangeDurationDays={onChangeDurationDays}
              onOpenStartDatePicker={onOpenStartDatePicker}
            />

            {/* Format-specific middle slots (Distance / Steps target) */}
            {children}

            {/* Price & Free event row */}
            <CreateEventPricingSection
              price={price}
              onChangePrice={onChangePrice}
              onCommitPrice={onCommitPrice}
              freeEvent={freeEvent}
              onToggleFreeEvent={onToggleFreeEvent}
              visibility={visibility}
              onChangeVisibility={onChangeVisibility}
              tickets={tickets}
              onOpenTicketModal={onOpenTicketModal || (() => {})}
              onRemoveTicket={onRemoveTicket}
              showCustomiseTickets={Boolean(onOpenTicketModal)}
            />
          </CreateEventHeroCard>

          {/* Suggestions & Terms section */}
          <View style={styles.suggestionsContainer}>
            <CreateEventSuggestionsSection
              registrationStartDate={registrationStartDate}
              registrationEndDate={registrationEndDate}
              onOpenRegStartDate={onOpenRegStartDate}
              onOpenRegEndDate={onOpenRegEndDate}
              dateWarning={dateWarning}
              participantFields={participantFields}
              onOpenParticipantModal={() => setParticipantModalOpen(true)}
              capacity={capacity}
              onOpenCapacityModal={() => setCapacityModalOpen(true)}
              rewardLabels={rewardLabels}
              onOpenRewardsModal={() => setRewardsModalOpen(true)}
            />

            {!isEditing ? (
              <CreateEventTermsCheckbox
                termsAccepted={termsAccepted}
                onToggle={() => setTermsAccepted(!termsAccepted)}
                visible={showTermsBox}
              />
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.bottomBarContainer}>
          <PublishActionBar
            label={isEditing ? "Save Changes" : "Publish Event"}
            onPress={() => {
              if (!isEditing && !termsAccepted) {
                showToastMessage("You must agree to the Terms and Policies.");
                return;
              }
              onPublish();
            }}
            loading={publishing}
            variant="glass"
            circleVariant="white"
          />
        </View>
      </KeyboardAvoidingView>

      {/* Shared Modals */}
      {onCloseTicketModal && onSaveTicket ? (
        <CreateTicketModal
          visible={ticketModalOpen}
          initial={editingTicket}
          tickets={tickets}
          onClose={onCloseTicketModal}
          onSave={onSaveTicket}
          onEditTicket={(ticket) => onOpenTicketModal?.(ticket)}
          onAddAnother={() => onOpenTicketModal?.(null)}
          format={format === "marathon" ? "marathon" : "step_challenge"}
        />
      ) : null}

      <CreateEventModals
        participantModalOpen={participantModalOpen}
        onCloseParticipantModal={() => setParticipantModalOpen(false)}
        participantFields={participantFields}
        onChangeParticipantFields={onChangeParticipantFields}
        rewardsModalOpen={rewardsModalOpen}
        onCloseRewardsModal={() => setRewardsModalOpen(false)}
        rewardLabels={rewardLabels}
        onChangeRewardLabels={onChangeRewardLabels}
        capacityModalOpen={capacityModalOpen}
        onCloseCapacityModal={() => setCapacityModalOpen(false)}
        capacity={capacity}
        onChangeCapacity={onChangeCapacity}
      />

      {extraModals}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 120,
  },
  suggestionsContainer: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingTop: 24,
  },
  bottomBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingBottom: 24,
  },
});

export default CreateEventFormShell;
