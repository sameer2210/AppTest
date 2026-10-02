import React from "react";
import ConfirmationModal from "@/components/confirmation/ConfirmationModal";
import CreateTicketModal, { type DraftTicket } from "../create/components/CreateTicketModal";
import type { StronEvent } from "@/models/stronManaged/event";

interface OrganizerPreviewModalsProps {
  event: StronEvent;
  editTicketModalVisible: boolean;
  onCloseEditTicket: () => void;
  onSaveTicket: (ticket: DraftTicket) => void;
  stopSaleModalVisible: boolean;
  onCloseStopSale: () => void;
  onConfirmStopSale: () => void;
  startSaleModalVisible: boolean;
  onCloseStartSale: () => void;
  onConfirmStartSale: () => void;
  deleteModalVisible: boolean;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  cancelModalVisible: boolean;
  onCloseCancel: () => void;
  onConfirmCancel: () => void;
}

export const OrganizerPreviewModals = React.memo(
  ({
    event,
    editTicketModalVisible,
    onCloseEditTicket,
    onSaveTicket,
    stopSaleModalVisible,
    onCloseStopSale,
    onConfirmStopSale,
    startSaleModalVisible,
    onCloseStartSale,
    onConfirmStartSale,
    deleteModalVisible,
    onCloseDelete,
    onConfirmDelete,
    cancelModalVisible,
    onCloseCancel,
    onConfirmCancel,
  }: OrganizerPreviewModalsProps) => {
    return (
      <>
        {/* Edit Ticket & Pricing Modal */}
        <CreateTicketModal
          visible={editTicketModalVisible}
          tickets={(event.ticketTypes || []).map((t, idx) => ({
            id: t.id || `t${idx + 1}`,
            label: t.label || "Standard",
            price: Number(t.price) || 0,
            distanceKm: t.distanceKm != null ? Number(t.distanceKm) : undefined,
            dailyStepTarget: t.dailyStepTarget != null ? Number(t.dailyStepTarget) : undefined,
            days: t.days != null ? Number(t.days) : undefined,
            benefits: t.benefits || "",
          }))}
          onClose={onCloseEditTicket}
          onSave={onSaveTicket}
          onEditTicket={() => {}}
          onAddAnother={() => {}}
          format={event.format === "virtual_step_challenge" ? "step_challenge" : "marathon"}
        />

        <ConfirmationModal
          visible={stopSaleModalVisible}
          title="Are you sure you want to stop ticket sales for this event?"
          titleColor="#000000"
          confirmText="Stop Sales"
          onCancel={onCloseStopSale}
          onConfirm={onConfirmStopSale}
        />

        <ConfirmationModal
          visible={startSaleModalVisible}
          title="Are you sure you want to re-open ticket sales for this event?"
          titleColor="#000000"
          confirmText="Start Sales"
          onCancel={onCloseStartSale}
          onConfirm={onConfirmStartSale}
        />

        <ConfirmationModal
          visible={deleteModalVisible}
          title="You're about to delete your event. Continue?"
          titleColor="#FF5454"
          confirmText="Yes, Delete"
          onCancel={onCloseDelete}
          onConfirm={onConfirmDelete}
        />

        <ConfirmationModal
          visible={cancelModalVisible}
          title="You're about to cancel your event. Continue?"
          titleColor="#FF5454"
          confirmText="Yes, Cancel"
          onCancel={onCloseCancel}
          onConfirm={onConfirmCancel}
        />
      </>
    );
  },
);

export default OrganizerPreviewModals;
