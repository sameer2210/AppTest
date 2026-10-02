import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import {
  SCREEN_CONTENT_PADDING_TOP,
  SCREEN_CONTENT_PADDING_BOTTOM,
  SCREEN_HORIZONTAL_PADDING,
} from "@/utils/screen-layout";
import { showToastMessage } from "@/utils/app-utils";
import CreateTicketCard, { DraftTicket, TicketFormFormat } from "./CreateTicketCard";

export type { DraftTicket, TicketFormFormat };

type Props = {
  visible: boolean;
  initial?: DraftTicket | null;
  tickets: DraftTicket[];
  onClose: () => void;
  onSave: (ticket: DraftTicket, options?: { addAnother?: boolean }) => void | Promise<void>;
  onEditTicket: (ticket: DraftTicket) => void;
  onAddAnother: () => void;
  ticketsOnly?: boolean;
  allowAdd?: boolean;
  title?: string;
  format?: TicketFormFormat;
};

const emptyTicket = (format: TicketFormFormat = "marathon"): DraftTicket => ({
  id: `t${Date.now()}_${Math.random().toString(36).substring(7)}`,
  label: "",
  price: 0,
  capacity: undefined,
  benefits: "",
  distanceKm: 5,
  days: 7,
  dailyStepTarget: format === "step_challenge" ? 8000 : undefined,
});

const CreateTicketModal = ({
  visible,
  initial,
  tickets,
  onClose,
  onSave,
  format = "marathon",
}: Props) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  // We maintain an array of drafts so the user can add multiple tickets inside the modal
  const [drafts, setDrafts] = useState<DraftTicket[]>([]);
  // Track which ticket is expanded. Usually the first one, or the one they just added.
  const [activeDraftIndex, setActiveDraftIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setDrafts([initial]);
    } else if (tickets.length > 0) {
      setDrafts(tickets);
    } else {
      setDrafts([emptyTicket(format)]);
    }
    setActiveDraftIndex(0);
  }, [visible, initial, tickets, format]);

  const updateDraft = (index: number, updates: Partial<DraftTicket>) => {
    setDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const addAnotherDraft = () => {
    setDrafts((prev) => [...prev, emptyTicket(format)]);
    setActiveDraftIndex(drafts.length);
  };

  const removeDraft = (index: number) => {
    if (drafts.length === 1) return;
    setDrafts((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    if (activeDraftIndex >= index && activeDraftIndex > 0) {
      setActiveDraftIndex(activeDraftIndex - 1);
    }
  };

  const saveAll = async () => {
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      if (!d.label?.trim()) {
        showToastMessage(`Ticket ${i + 1} title is required.`);
        return;
      }
      if (!(d.price >= 0) || !Number.isFinite(d.price)) {
        showToastMessage(`Ticket ${i + 1} price must be zero or more.`);
        return;
      }
    }

    try {
      for (const d of drafts) {
        await Promise.resolve(onSave(d));
      }
      onClose(); // Parent shows toast
    } catch {
      // Error
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              paddingBottom: 160 + SCREEN_CONTENT_PADDING_BOTTOM,
              paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.headerRow, { marginTop: topInset + 8, marginBottom: 12 }]}>
              <PressableScale
                onPress={onClose}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </PressableScale>
            </View>

            <View style={styles.content}>
              {drafts.map((draft, index) => {
                if (index === activeDraftIndex) {
                  return (
                    <View key={draft.id}>
                      <CreateTicketCard
                        ticket={draft}
                        index={index}
                        format={format}
                        onChange={(updates) => updateDraft(index, updates)}
                      />
                      {drafts.length > 1 && (
                        <PressableScale onPress={() => removeDraft(index)} style={styles.deleteBtn}>
                          <Ionicons name="trash-outline" size={18} color="#FF5151" />
                          <CustomText
                            style={{
                              ...fontTextStyles.fourteenNormalBlack,
                              color: "#FF5151",
                              marginLeft: 8,
                            }}
                          >
                            Delete Ticket
                          </CustomText>
                        </PressableScale>
                      )}
                    </View>
                  );
                } else {
                  return (
                    <PressableScale
                      key={draft.id}
                      style={styles.collapsedCard}
                      onPress={() => setActiveDraftIndex(index)}
                    >
                      <CustomText
                        style={{
                          ...fontTextStyles.sixteenNormalBlack,
                          color: "#FFFFFF",
                        }}
                      >
                        {draft.label ? draft.label : `Add Ticket ${index + 1}`}
                      </CustomText>
                      <Ionicons name="add" size={24} color="#3573FA" />
                    </PressableScale>
                  );
                }
              })}

              {drafts.length < 5 && activeDraftIndex !== drafts.length && (
                <PressableScale style={styles.collapsedCard} onPress={addAnotherDraft}>
                  <CustomText
                    style={{
                      ...fontTextStyles.sixteenNormalBlack,
                      color: "#FFFFFF",
                    }}
                  >
                    Add Ticket {drafts.length + 1}
                  </CustomText>
                  <Ionicons name="add" size={24} color="#3573FA" />
                </PressableScale>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={[styles.footer, { paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM }]}>
          <View style={styles.glassBar}>
            <BlurView
              intensity={Platform.OS === "ios" ? 36 : 50}
              tint="dark"
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.glassFill} />
            <PressableScale onPress={onClose} style={styles.discardGlassBtn}>
              <CustomText
                style={{
                  ...fontTextStyles.sixteenNormalBlack,
                  color: "#FF5151",
                }}
              >
                Discard
              </CustomText>
            </PressableScale>
            <PressableScale onPress={() => void saveAll()} style={styles.saveGlassBtn}>
              <CustomText
                style={{
                  ...fontTextStyles.sixteenNormalBlack,
                  color: "#FFFFFF",
                }}
              >
                Save
              </CustomText>
              <LinearGradient
                colors={["#6BB0FF", "#086CFF", "#0047D0"]}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={styles.saveIconWrapperGlass}
              >
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </LinearGradient>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0C0E",
  },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 0,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {},
  half: { flex: 1 },
  addSlot: {
    height: 60,
    borderRadius: 12,
    backgroundColor: "#191919",
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginTop: 24,
  },
  footer: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 0,
    alignItems: "center",
  },
  glassBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 70,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    width: "100%",
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  discardGlassBtn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  saveGlassBtn: {
    flex: 1.2,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 6,
  },
  saveIconWrapperGlass: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
  },
  collapsedCard: {
    height: 60,
    borderRadius: 12,
    backgroundColor: "#191919",
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    marginTop: -4,
    marginLeft: 8,
  },
});

export default CreateTicketModal;
