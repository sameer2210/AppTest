import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { PressableScale } from "@/components/ui";
import { showToastMessage } from "@/utils/app-utils";
import CreateGlassField from "@/components/form/CreateGlassField";
import { ListingVisibilityToggle, type ListingVisibility } from "./ListingVisibilityToggle";
import type { DraftTicket } from "./CreateTicketModal";

interface CreateEventPricingSectionProps {
  price: string;
  onChangePrice: (val: string) => void;
  onCommitPrice?: () => void;
  freeEvent: boolean;
  onToggleFreeEvent: () => void;
  visibility: ListingVisibility;
  onChangeVisibility: (val: ListingVisibility) => void;
  tickets?: DraftTicket[];
  onOpenTicketModal: (ticket: DraftTicket | null) => void;
  onRemoveTicket?: (id: string) => void;
  showCustomiseTickets?: boolean;
}

export const CreateEventPricingSection = React.memo(
  ({
    price,
    onChangePrice,
    onCommitPrice,
    freeEvent,
    onToggleFreeEvent,
    visibility,
    onChangeVisibility,
    tickets = [],
    onOpenTicketModal,
    onRemoveTicket,
    showCustomiseTickets = true,
  }: CreateEventPricingSectionProps) => {
  return (
    <View style={styles.container}>
      {/* Side-by-Side Row: Price & Free Event */}
      <View style={styles.sideBySideRow}>
        <View style={styles.fieldFlex}>
          <CreateGlassField
            label="Price"
            placeholder="0"
            value={freeEvent ? "" : price}
            onChangeText={(val) => {
              if (freeEvent && Number(val) > 0) {
                showToastMessage("Cannot add paid tickets for a free event.");
                return;
              }
              onChangePrice(val);
            }}
            prefix="₹"
            keyboardType="number-pad"
            editable={!freeEvent}
            onEndEditing={onCommitPrice}
            returnKeyType="done"
            onSubmitEditing={onCommitPrice}
          />
        </View>

        <View style={styles.freeEventCol}>
          <PressableScale
            onPress={onToggleFreeEvent}
            style={styles.freeEventBtn}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: freeEvent }}
          >
            <CustomText style={styles.freeEventText}>Free Event </CustomText>
            <View
              style={[
                styles.radioOuter,
                freeEvent ? styles.radioChecked : styles.radioUnchecked,
              ]}
            >
              {freeEvent ? <View style={styles.radioInner} /> : null}
            </View>
          </PressableScale>
        </View>
      </View>

      <ListingVisibilityToggle value={visibility} onChange={onChangeVisibility} />

      {/* Multi Ticket Tier Rows */}
      {!freeEvent && tickets.length > 0 ? (
        <View style={styles.tiersContainer}>
          <CustomText style={styles.tiersHeading}>
            Added Ticket Tiers:
          </CustomText>
          {tickets.map((t, idx) => (
            <View
              key={t.id}
              style={styles.tierCard}
            >
              <View style={styles.tierInfo}>
                <CustomText style={styles.tierLabel}>
                  {t.label || `Tier ${idx + 1}`}
                </CustomText>
                {t.benefits ? (
                  <CustomText style={styles.tierBenefits}>
                    {t.benefits}
                  </CustomText>
                ) : null}
              </View>
              <CustomText style={styles.tierPrice}>
                ₹{t.price}
              </CustomText>
              <PressableScale
                onPress={() => onOpenTicketModal(t)}
                style={styles.iconBtn}
                accessibilityLabel="Edit ticket"
              >
                <Ionicons name="pencil-outline" size={18} color="#086CFF" />
              </PressableScale>
              {onRemoveTicket ? (
                <PressableScale
                  onPress={() => onRemoveTicket(t.id)}
                  style={styles.deleteIconBtn}
                  accessibilityLabel="Delete ticket"
                >
                  <Ionicons name="trash-outline" size={18} color="#FF5151" />
                </PressableScale>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {showCustomiseTickets ? (
        <PressableScale
          onPress={() => {
            if (tickets.length === 0 && price) {
              onCommitPrice?.();
            } else {
              onOpenTicketModal(null);
            }
          }}
          style={styles.customiseBtn}
          accessibilityRole="button"
        >
          <CustomText style={styles.customiseText}>
            {"✏️ Customise - Add ticket types and Benefits"}
          </CustomText>
        </PressableScale>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 12,
  },
  sideBySideRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  fieldFlex: {
    flex: 1,
  },
  freeEventCol: {
    height: 48,
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  freeEventBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  freeEventText: {
    fontFamily: "SpaceGrotesk-Medium",
    marginRight: 8,
    fontSize: 14,
    color: "#FFFFFF",
  },
  radioOuter: {
    height: 20,
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  radioChecked: {
    borderColor: "#086CFF",
    backgroundColor: "#086CFF",
  },
  radioUnchecked: {
    borderColor: "rgba(255, 255, 255, 0.6)",
    backgroundColor: "transparent",
  },
  radioInner: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  tiersContainer: {
    marginTop: 12,
    gap: 10,
  },
  tiersHeading: {
    fontSize: 14,
    fontWeight: "500",
    color: "#D9D9D9",
  },
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tierInfo: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tierBenefits: {
    marginTop: 2,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  tierPrice: {
    marginRight: 12,
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  iconBtn: {
    marginRight: 8,
    padding: 4,
  },
  deleteIconBtn: {
    padding: 4,
  },
  customiseBtn: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 14,
  },
  customiseText: {
    textAlign: "center",
    fontSize: 15,
    color: "#D9D9D9",
  },
});

export default CreateEventPricingSection;
